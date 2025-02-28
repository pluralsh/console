package controller

import (
	"context"
	"fmt"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	console "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/credentials"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

const StackDefinitionFinalizer = "deployments.plural.sh/stackdefinition-protection"

// StackDefinitionReconciler reconciles a [v1alpha1.StackDefinition] object
type StackDefinitionReconciler struct {
	client.Client
	Scheme           *runtime.Scheme
	ConsoleClient    consoleclient.ConsoleClient
	CredentialsCache credentials.NamespaceCredentialsCache
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=stackdefinitions,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=stackdefinitions/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=stackdefinitions/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the stack definition closer to the desired state.
func (in *StackDefinitionReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := log.FromContext(ctx)

	stack := &v1alpha1.StackDefinition{}
	if err := in.Get(ctx, req.NamespacedName, stack); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	utils.MarkCondition(stack.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	scope, err := NewDefaultScope(ctx, in.Client, stack)
	if err != nil {
		logger.Error(err, "failed to create stack definition scope")
		utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	// Switch to namespace credentials if configured. This has to be done before sending any request to the console.
	nc, err := in.ConsoleClient.UseCredentials(req.Namespace, in.CredentialsCache)
	credentials.SyncCredentialsInfo(stack, stack.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	// Mark resource as not ready. This will be overridden in the end.
	utils.MarkCondition(stack.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	// Handle proper resource deletion via finalizer
	result, err := in.addOrRemoveFinalizer(ctx, stack)
	if result != nil {
		return *result, err
	}

	// Mark resource as managed by this operator.
	utils.MarkCondition(stack.SetCondition, v1alpha1.ReadonlyConditionType, metav1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")

	// Get StackDefinition SHA that can be saved back in the status to check for changes
	changed, sha, err := stack.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate stack definition SHA")
		utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Sync StackDefinition CRD with the Console API
	apiStack, err := in.sync(ctx, stack, changed)
	if err != nil {
		logger.Error(err, "unable to create or update stack definition")
		utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	stack.Status.ID = &apiStack.ID
	stack.Status.SHA = &sha

	utils.MarkCondition(stack.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return ctrl.Result{}, reterr
}

// SetupWithManager sets up the controller with the Manager.
func (in *StackDefinitionReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).                                                              // Requirement for credentials implementation.
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(in.Client, new(v1alpha1.StackDefinitionList))). // Reconcile objects on credentials change.
		For(&v1alpha1.StackDefinition{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(in)
}

func (in *StackDefinitionReconciler) addOrRemoveFinalizer(ctx context.Context, stack *v1alpha1.StackDefinition) (*ctrl.Result, error) {
	// If object is not being deleted and if it does not have our finalizer,
	// then lets add the finalizer. This is equivalent to registering our finalizer.
	if stack.ObjectMeta.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(stack, StackDefinitionFinalizer) {
		controllerutil.AddFinalizer(stack, StackDefinitionFinalizer)
		return nil, nil
	}

	// If object is being deleted cleanup and remove the finalizer.
	if !stack.ObjectMeta.DeletionTimestamp.IsZero() {
		// Remove StackDefinition from Console API if it exists
		exists, err := in.isAlreadyExists(ctx, stack)
		if err != nil {
			return &ctrl.Result{}, err
		}

		if exists && !stack.Status.IsReadonly() {
			if err := in.ConsoleClient.DeleteStackDefinition(ctx, stack.Status.GetID()); err != nil {
				// if it fails to delete the external dependency here, return with error
				// so that it can be retried.
				utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return &ctrl.Result{}, err
			}

			// If deletion process started requeue so that we can make sure stack definition
			// has been deleted from Console API before removing the finalizer.
			return &requeue, nil
		}

		// Stop reconciliation as the item is being deleted
		controllerutil.RemoveFinalizer(stack, StackDefinitionFinalizer)
		return &ctrl.Result{}, nil
	}

	return nil, nil
}

func (in *StackDefinitionReconciler) isAlreadyExists(ctx context.Context, stack *v1alpha1.StackDefinition) (bool, error) {
	if !stack.Status.HasID() {
		return false, nil
	}

	return in.ConsoleClient.IsStackDefinitionExists(ctx, stack.Status.GetID())
}

func (in *StackDefinitionReconciler) sync(ctx context.Context, stack *v1alpha1.StackDefinition, changed bool) (*console.StackDefinitionFragment, error) {
	exists, err := in.isAlreadyExists(ctx, stack)
	if err != nil {
		return nil, err
	}

	// Update only if StackDefinition has changed
	if changed && exists {
		return in.ConsoleClient.UpdateStackDefinition(ctx, stack.Status.GetID(), stack.Attributes())
	}

	// Read the StackDefinition from Console API if it already exists
	if exists {
		return in.ConsoleClient.GetStackDefinition(ctx, stack.Status.GetID())
	}

	// Create the StackDefinition in Console API if it doesn't exist
	return in.ConsoleClient.CreateStackDefinition(ctx, stack.Attributes())
}
