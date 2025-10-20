package controller

import (
	"context"
	"fmt"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/internal/common"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/errors"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/utils"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

const (
	// PreviewEnvironmentTemplateFinalizerName defines name for the main finalizer that synchronizes
	// resource deletion from the Console API prior to removing the CRD.
	PreviewEnvironmentTemplateFinalizerName = "projects.deployments.plural.sh/preview-environment-template-protection"
)

// PreviewEnvironmentTemplateReconciler reconciles a PreviewEnvironmentTemplate object
type PreviewEnvironmentTemplateReconciler struct {
	client.Client

	ConsoleClient consoleclient.ConsoleClient
	Scheme        *runtime.Scheme
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=previewenvironmenttemplates,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=previewenvironmenttemplates/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=previewenvironmenttemplates/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
func (r *PreviewEnvironmentTemplateReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := log.FromContext(ctx)
	logger.V(5).Info("reconciling preview environment template")

	template := new(v1alpha1.PreviewEnvironmentTemplate)
	if err := r.Get(ctx, req.NamespacedName, template); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := common.NewDefaultScope(ctx, r.Client, template)
	if err != nil {
		logger.Error(err, "failed to create scope")
		return ctrl.Result{}, err
	}
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	utils.MarkCondition(template.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(template.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "")

	// Handle proper resource deletion via finalizer
	if result := r.addOrRemoveFinalizer(ctx, template); result != nil {
		return *result, nil
	}

	// Get Catalog SHA that can be saved back in the status to check for changes
	changed, sha, err := template.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate catalog SHA")
		utils.MarkCondition(template.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if changed {
		attr, res, err := getAttributes(ctx, r.Client, *template)
		if res != nil || err != nil {
			return common.HandleRequeue(res, err, template.SetCondition)
		}
		apiPreviewEnvironmentTemplate, err := r.ConsoleClient.UpsertPreviewEnvironmentTemplate(ctx, *attr)
		if err != nil {
			logger.Error(err, "unable to create or update catalog")
			utils.MarkCondition(template.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		template.Status.ID = &apiPreviewEnvironmentTemplate.ID
		template.Status.SHA = &sha
	}
	utils.MarkCondition(template.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(template.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return template.Spec.Reconciliation.Requeue(), nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *PreviewEnvironmentTemplateReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.PreviewEnvironmentTemplate{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}

func (r *PreviewEnvironmentTemplateReconciler) addOrRemoveFinalizer(ctx context.Context, template *v1alpha1.PreviewEnvironmentTemplate) *ctrl.Result {
	// If object is not being deleted and if it does not have our finalizer,
	// then lets add the finalizer. This is equivalent to registering our finalizer.
	if template.GetDeletionTimestamp().IsZero() && !controllerutil.ContainsFinalizer(template, PreviewEnvironmentTemplateFinalizerName) {
		controllerutil.AddFinalizer(template, PreviewEnvironmentTemplateFinalizerName)
	}

	// If object is not being deleted, do nothing
	if template.GetDeletionTimestamp().IsZero() {
		return nil
	}

	// if object is being deleted but there is no console ID available to delete the resource
	// remove the finalizer and stop reconciliation
	if !template.Status.HasID() {
		// stop reconciliation as there is no console ID available to delete the resource
		controllerutil.RemoveFinalizer(template, PreviewEnvironmentTemplateFinalizerName)
		return &ctrl.Result{}
	}

	_, err := r.ConsoleClient.GetPreviewEnvironmentTemplate(ctx, template.Status.ID, nil)
	if err != nil {
		if errors.IsNotFound(err) {
			controllerutil.RemoveFinalizer(template, PreviewEnvironmentTemplateFinalizerName)
			return &ctrl.Result{}
		}
		utils.MarkCondition(template.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return lo.ToPtr(common.Wait())
	}

	// try to delete the resource
	if err := r.ConsoleClient.DeletePreviewEnvironmentTemplate(ctx, template.Status.GetID()); err != nil {
		// If it fails to delete the external dependency here, return with error
		// so that it can be retried.
		utils.MarkCondition(template.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return lo.ToPtr(common.Wait())
	}

	// stop reconciliation as the item has been deleted
	controllerutil.RemoveFinalizer(template, PreviewEnvironmentTemplateFinalizerName)
	return &ctrl.Result{}
}

func getAttributes(ctx context.Context, kubeClient client.Client, template v1alpha1.PreviewEnvironmentTemplate) (*console.PreviewEnvironmentTemplateAttributes, *ctrl.Result, error) {
	attr := &console.PreviewEnvironmentTemplateAttributes{
		Name:            template.ConsoleName(),
		CommentTemplate: template.Spec.CommentTemplate,
	}
	sta, err := common.ServiceTemplateAttributes(ctx, kubeClient, template.Namespace, &template.Spec.Template, nil)
	if err != nil {
		return nil, nil, err
	}
	attr.Template = *sta

	helper := utils.NewConsoleHelper(ctx, kubeClient)

	ns := template.Spec.FlowRef.Namespace
	if ns == "" {
		template.Spec.FlowRef.Namespace = template.Namespace
	}
	flowID, err := helper.IDFromRef(&template.Spec.FlowRef, &v1alpha1.Flow{})
	if err != nil {
		return nil, nil, err
	}
	if flowID == nil {
		return nil, lo.ToPtr(common.Wait()), fmt.Errorf("flow is not ready")
	}
	attr.FlowID = *flowID

	serviceID, err := helper.IDFromRef(&template.Spec.ReferenceServiceRef, &v1alpha1.ServiceDeployment{})
	if err != nil {
		return nil, nil, err
	}
	if serviceID == nil {
		return nil, lo.ToPtr(common.Wait()), fmt.Errorf("service is not ready")
	}
	attr.ReferenceServiceID = *serviceID

	if template.Spec.ScmConnectionRef != nil {
		connectionID, err := helper.IDFromRef(template.Spec.ScmConnectionRef, &v1alpha1.ScmConnection{})
		if err != nil {
			return nil, nil, err
		}
		if connectionID == nil {
			return nil, lo.ToPtr(common.Wait()), fmt.Errorf("scm connection is not ready")
		}
		attr.ConnectionID = connectionID
	}

	return attr, nil, nil
}
