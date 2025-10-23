package controller

import (
	"context"

	"github.com/pluralsh/console/go/controller/internal/common"
	"github.com/pluralsh/console/go/controller/internal/identity"
	"github.com/samber/lo"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	consoleapi "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

const (
	// FederatedCredentialProtectionFinalizerName defines name for the main finalizer that synchronizes
	// resource deletion from the Console API prior to removing the CRD.
	FederatedCredentialProtectionFinalizerName = "projects.deployments.plural.sh/federated-credential-protection"
)

type FederatedCredentialReconciler struct {
	client.Client
	ConsoleClient consoleclient.ConsoleClient
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=federatedcredentials,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=federatedcredentials/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=federatedcredentials/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (in *FederatedCredentialReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := log.FromContext(ctx)

	credential := new(v1alpha1.FederatedCredential)
	if err := in.Get(ctx, req.NamespacedName, credential); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := common.NewDefaultScope(ctx, in.Client, credential)
	if err != nil {
		logger.Error(err, "failed to create scope")
		return ctrl.Result{}, err
	}
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	utils.MarkCondition(credential.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(credential.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "")

	// Handle proper resource deletion via finalizer
	if result := in.addOrRemoveFinalizer(ctx, credential); result != nil {
		return *result, nil
	}

	// Get ObservabilityProvider SHA that can be saved back in the status to check for changes
	changed, sha, err := credential.Diff(utils.HashObject)
	if err != nil {
		utils.MarkCondition(credential.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	apiCredential, err := in.sync(ctx, credential, changed)
	if err != nil {
		return common.HandleRequeue(nil, err, credential.SetCondition)
	}

	credential.Status.ID = &apiCredential.ID
	credential.Status.SHA = &sha

	utils.MarkCondition(credential.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(credential.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return credential.Spec.Reconciliation.Requeue(), nil
}

func (in *FederatedCredentialReconciler) addOrRemoveFinalizer(ctx context.Context, credential *v1alpha1.FederatedCredential) *ctrl.Result {
	// If object is not being deleted and if it does not have our finalizer,
	// then lets add the finalizer. This is equivalent to registering our finalizer.
	if credential.GetDeletionTimestamp().IsZero() && !controllerutil.ContainsFinalizer(credential, FederatedCredentialProtectionFinalizerName) {
		controllerutil.AddFinalizer(credential, FederatedCredentialProtectionFinalizerName)
	}

	// If object is not being deleted, do nothing
	if credential.GetDeletionTimestamp().IsZero() {
		return nil
	}

	// if object is being deleted but there is no console ID available to delete the resource
	// remove the finalizer and stop reconciliation
	if !credential.Status.HasID() {
		// stop reconciliation as there is no console ID available to delete the resource
		controllerutil.RemoveFinalizer(credential, FederatedCredentialProtectionFinalizerName)
		return &ctrl.Result{}
	}

	// try to delete the resource
	if _, err := in.ConsoleClient.DeleteFederatedCredential(ctx, credential.Status.GetID()); err != nil {
		// If it fails to delete the external dependency here, return with error
		// so that it can be retried.
		utils.MarkCondition(credential.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return lo.ToPtr(credential.Spec.Reconciliation.Requeue())
	}

	// stop reconciliation as the item has been deleted
	controllerutil.RemoveFinalizer(credential, FederatedCredentialProtectionFinalizerName)
	return &ctrl.Result{}
}

func (in *FederatedCredentialReconciler) sync(ctx context.Context, credential *v1alpha1.FederatedCredential, changed bool) (*consoleapi.FederatedCredentialFragment, error) {
	userID, err := identity.Cache().GetUserID(credential.Spec.User)
	if err != nil {
		return nil, err
	}

	attributes := credential.Attributes(userID)

	if !credential.Status.HasID() {
		return in.createFederatedCredential(ctx, attributes)
	}

	exists, err := in.ConsoleClient.IsFederatedCredentialExists(ctx, credential.Status.GetID())
	if err != nil {
		return nil, err
	}

	if !exists {
		return in.createFederatedCredential(ctx, attributes)
	}

	if !changed {
		return in.ConsoleClient.GetFederatedCredential(ctx, credential.Status.GetID())
	}

	return in.ConsoleClient.UpdateFederatedCredential(ctx, credential.Status.GetID(), attributes)
}

func (in *FederatedCredentialReconciler) createFederatedCredential(ctx context.Context, attributes consoleapi.FederatedCredentialAttributes) (*consoleapi.FederatedCredentialFragment, error) {
	apiCredential, err := in.ConsoleClient.CreateFederatedCredential(ctx, attributes)
	if err != nil {
		return nil, err
	}

	return apiCredential, nil
}

// SetupWithManager sets up the controller with the Manager.
func (in *FederatedCredentialReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.FederatedCredential{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(in)
}
