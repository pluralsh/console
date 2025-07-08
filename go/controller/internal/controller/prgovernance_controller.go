package controller

import (
	"context"
	"fmt"

	console "github.com/pluralsh/console/go/client"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/utils"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

const PrGovernanceFinalizerName = "projects.deployments.plural.sh/pr-governance-protection"

// PrGovernanceReconciler reconciles a PrGovernance object
type PrGovernanceReconciler struct {
	client.Client
	Scheme        *runtime.Scheme
	ConsoleClient consoleclient.ConsoleClient
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=prgovernances,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=prgovernances/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=prgovernances/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *PrGovernanceReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, retErr error) {
	logger := log.FromContext(ctx)
	logger.V(5).Info("reconciling PrGovernance")

	prGovernance := new(v1alpha1.PrGovernance)
	if err := r.Get(ctx, req.NamespacedName, prGovernance); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	utils.MarkCondition(prGovernance.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(prGovernance.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "")

	scope, err := NewDefaultScope(ctx, r.Client, prGovernance)
	if err != nil {
		utils.MarkCondition(prGovernance.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && retErr == nil {
			retErr = err
		}
	}()

	// Handle proper resource deletion via finalizer
	if result := r.addOrRemoveFinalizer(ctx, prGovernance); result != nil {
		return *result, nil
	}

	// Get SHA that can be saved back in the status to check for changes
	changed, sha, err := prGovernance.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate catalog SHA")
		utils.MarkCondition(prGovernance.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if changed {
		attr, res, err := r.attributes(ctx, prGovernance)
		if res != nil || err != nil {
			return handleRequeue(res, err, prGovernance.SetCondition)
		}
		apiPrGovernance, err := r.ConsoleClient.UpsertPrGovernance(ctx, *attr)
		if err != nil {
			logger.Error(err, "unable to upsert PrGovernance")
			utils.MarkCondition(prGovernance.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		prGovernance.Status.ID = &apiPrGovernance.ID
		prGovernance.Status.SHA = &sha
	}
	utils.MarkCondition(prGovernance.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(prGovernance.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return ctrl.Result{}, nil
}

func (r *PrGovernanceReconciler) addOrRemoveFinalizer(ctx context.Context, prGovernance *v1alpha1.PrGovernance) *ctrl.Result {
	// If object is not being deleted and if it does not have our finalizer,
	// then lets add the finalizer. This is equivalent to registering our finalizer.
	if prGovernance.GetDeletionTimestamp().IsZero() && !controllerutil.ContainsFinalizer(prGovernance, PreviewEnvironmentTemplateFinalizerName) {
		controllerutil.AddFinalizer(prGovernance, PrGovernanceFinalizerName)
	}

	// If object is not being deleted, do nothing
	if prGovernance.GetDeletionTimestamp().IsZero() {
		return nil
	}

	// if object is being deleted but there is no console ID available to delete the resource
	// remove the finalizer and stop reconciliation
	if !prGovernance.Status.HasID() {
		// stop reconciliation as there is no console ID available to delete the resource
		controllerutil.RemoveFinalizer(prGovernance, PrGovernanceFinalizerName)
		return &ctrl.Result{}
	}

	_, err := r.ConsoleClient.GetPrGovernance(ctx, prGovernance.Status.ID, nil)
	if err != nil {
		if errors.IsNotFound(err) {
			controllerutil.RemoveFinalizer(prGovernance, PrGovernanceFinalizerName)
			return &ctrl.Result{}
		}
		utils.MarkCondition(prGovernance.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return &waitForResources
	}

	// try to delete the resource
	if err := r.ConsoleClient.DeletePrGovernance(ctx, prGovernance.Status.GetID()); err != nil {
		// If it fails to delete the external dependency here, return with error
		// so that it can be retried.
		utils.MarkCondition(prGovernance.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return &waitForResources
	}

	// stop reconciliation as the item has been deleted
	controllerutil.RemoveFinalizer(prGovernance, PrGovernanceFinalizerName)
	return &ctrl.Result{}
}

func (r *PrGovernanceReconciler) attributes(ctx context.Context, prGovernance *v1alpha1.PrGovernance) (*console.PrGovernanceAttributes, *ctrl.Result, error) {
	attributes := &console.PrGovernanceAttributes{
		Name: prGovernance.ConsoleName(),
	}

	connection := &v1alpha1.ScmConnection{}
	ref := prGovernance.Spec.ConnectionRef
	if ref.Namespace == "" {
		ref.Namespace = prGovernance.Namespace
	}
	if err := r.Get(ctx, types.NamespacedName{Name: ref.Name, Namespace: ref.Namespace}, connection); err != nil {
		return nil, nil, err
	}
	if !connection.Status.HasID() {
		return nil, &waitForResources, fmt.Errorf("scm connection is not ready")
	}
	attributes.ConnectionID = *connection.Status.ID

	if prGovernance.Spec.Configuration != nil {
		attributes.Configuration = &console.PrGovernanceConfigurationAttributes{
			Webhook: &console.GovernanceWebhookAttributes{
				URL: prGovernance.Spec.Configuration.Webhooks.Url,
			},
		}
	}

	return attributes, nil, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *PrGovernanceReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.PrGovernance{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}
