package controller

import (
	"context"
	"fmt"

	console "github.com/pluralsh/console/go/client"
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
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *PreviewEnvironmentTemplateReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, retErr error) {
	logger := log.FromContext(ctx)
	logger.V(5).Info("reconciling preview environment template")

	previewEnvTmpl := new(v1alpha1.PreviewEnvironmentTemplate)
	if err := r.Get(ctx, req.NamespacedName, previewEnvTmpl); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	utils.MarkCondition(previewEnvTmpl.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(previewEnvTmpl.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "")

	scope, err := NewDefaultScope(ctx, r.Client, previewEnvTmpl)
	if err != nil {
		utils.MarkCondition(previewEnvTmpl.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && retErr == nil {
			retErr = err
		}
	}()

	// Handle proper resource deletion via finalizer
	if result := r.addOrRemoveFinalizer(ctx, previewEnvTmpl); result != nil {
		return *result, nil
	}

	// Get Catalog SHA that can be saved back in the status to check for changes
	changed, sha, err := previewEnvTmpl.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate catalog SHA")
		utils.MarkCondition(previewEnvTmpl.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if changed {
		attr, res, err := getAttributes(ctx, r.Client, *previewEnvTmpl)
		if res != nil || err != nil {
			return handleRequeue(res, err, previewEnvTmpl.SetCondition)
		}
		apiPreviewEnvironmentTemplate, err := r.ConsoleClient.UpsertPreviewEnvironmentTemplate(ctx, *attr)
		if err != nil {
			logger.Error(err, "unable to create or update catalog")
			utils.MarkCondition(previewEnvTmpl.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		previewEnvTmpl.Status.ID = &apiPreviewEnvironmentTemplate.ID
		previewEnvTmpl.Status.SHA = &sha
	}
	utils.MarkCondition(previewEnvTmpl.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(previewEnvTmpl.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *PreviewEnvironmentTemplateReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.PreviewEnvironmentTemplate{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}

func (r *PreviewEnvironmentTemplateReconciler) addOrRemoveFinalizer(ctx context.Context, previewEnvTmpl *v1alpha1.PreviewEnvironmentTemplate) *ctrl.Result {
	// If object is not being deleted and if it does not have our finalizer,
	// then lets add the finalizer. This is equivalent to registering our finalizer.
	if previewEnvTmpl.GetDeletionTimestamp().IsZero() && !controllerutil.ContainsFinalizer(previewEnvTmpl, PreviewEnvironmentTemplateFinalizerName) {
		controllerutil.AddFinalizer(previewEnvTmpl, PreviewEnvironmentTemplateFinalizerName)
	}

	// If object is not being deleted, do nothing
	if previewEnvTmpl.GetDeletionTimestamp().IsZero() {
		return nil
	}

	// if object is being deleted but there is no console ID available to delete the resource
	// remove the finalizer and stop reconciliation
	if !previewEnvTmpl.Status.HasID() {
		// stop reconciliation as there is no console ID available to delete the resource
		controllerutil.RemoveFinalizer(previewEnvTmpl, PreviewEnvironmentTemplateFinalizerName)
		return &ctrl.Result{}
	}

	_, err := r.ConsoleClient.GetPreviewEnvironmentTemplate(ctx, previewEnvTmpl.Status.ID, nil)
	if err != nil {
		if errors.IsNotFound(err) {
			controllerutil.RemoveFinalizer(previewEnvTmpl, PreviewEnvironmentTemplateFinalizerName)
			return &ctrl.Result{}
		}
		utils.MarkCondition(previewEnvTmpl.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return lo.ToPtr(jitterRequeue(requeueWaitForResources))
	}

	// try to delete the resource
	if err := r.ConsoleClient.DeletePreviewEnvironmentTemplate(ctx, previewEnvTmpl.Status.GetID()); err != nil {
		// If it fails to delete the external dependency here, return with error
		// so that it can be retried.
		utils.MarkCondition(previewEnvTmpl.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return lo.ToPtr(jitterRequeue(requeueWaitForResources))
	}

	// stop reconciliation as the item has been deleted
	controllerutil.RemoveFinalizer(previewEnvTmpl, PreviewEnvironmentTemplateFinalizerName)
	return &ctrl.Result{}
}

func getAttributes(ctx context.Context, kubeClient client.Client, previewEnvTmpl v1alpha1.PreviewEnvironmentTemplate) (*console.PreviewEnvironmentTemplateAttributes, *ctrl.Result, error) {
	attr := &console.PreviewEnvironmentTemplateAttributes{
		Name:            previewEnvTmpl.ConsoleName(),
		CommentTemplate: previewEnvTmpl.Spec.CommentTemplate,
	}
	sta, err := genServiceTemplate(ctx, kubeClient, previewEnvTmpl.Namespace, &previewEnvTmpl.Spec.Template, nil)
	if err != nil {
		return nil, nil, err
	}
	attr.Template = *sta

	helper := utils.NewConsoleHelper(ctx, kubeClient)

	ns := previewEnvTmpl.Spec.FlowRef.Namespace
	if ns == "" {
		previewEnvTmpl.Spec.FlowRef.Namespace = previewEnvTmpl.Namespace
	}
	flowID, err := helper.IDFromRef(&previewEnvTmpl.Spec.FlowRef, &v1alpha1.Flow{})
	if err != nil {
		return nil, nil, err
	}
	if flowID == nil {
		return nil, lo.ToPtr(jitterRequeue(requeueWaitForResources)), fmt.Errorf("flow is not ready")
	}
	attr.FlowID = *flowID

	serviceID, err := helper.IDFromRef(&previewEnvTmpl.Spec.ReferenceServiceRef, &v1alpha1.ServiceDeployment{})
	if err != nil {
		return nil, nil, err
	}
	if serviceID == nil {
		return nil, lo.ToPtr(jitterRequeue(requeueWaitForResources)), fmt.Errorf("service is not ready")
	}
	attr.ReferenceServiceID = *serviceID

	if previewEnvTmpl.Spec.ScmConnectionRef != nil {
		connectionID, err := helper.IDFromRef(previewEnvTmpl.Spec.ScmConnectionRef, &v1alpha1.ScmConnection{})
		if err != nil {
			return nil, nil, err
		}
		if connectionID == nil {
			return nil, lo.ToPtr(jitterRequeue(requeueWaitForResources)), fmt.Errorf("scm connection is not ready")
		}
		attr.ConnectionID = connectionID
	}

	return attr, nil, nil
}
