package controller

import (
	"context"
	"fmt"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	console "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

// ProviderReconciler reconciles a v1alpha1.Provider object.
// Implements reconcile.Reconciler and types.Controller
type ProviderReconciler struct {
	client.Client

	ConsoleClient consoleclient.ConsoleClient
	Scheme        *runtime.Scheme
}

const (
	// ProviderProtectionFinalizerName defines name for the main finalizer that synchronizes
	// resource deletion from the Console API prior to removing the CRD.
	ProviderProtectionFinalizerName = "providers.deployments.plural.sh/provider-protection"
)

// +kubebuilder:rbac:groups=deployments.plural.sh,resources=providers,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=providers/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=providers/finalizers,verbs=update
// +kubebuilder:rbac:groups=core,resources=secrets,verbs=get;list;watch;patch

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the v1alpha1.Provider closer to the desired state
// and syncs it with the Console API state.
func (r *ProviderReconciler) Reconcile(ctx context.Context, req reconcile.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	// Read Provider CRD from the K8S API
	provider := new(v1alpha1.Provider)
	if err := r.Get(ctx, req.NamespacedName, provider); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	utils.MarkCondition(provider.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
	scope, err := NewDefaultScope(ctx, r.Client, provider)
	if err != nil {
		utils.MarkCondition(provider.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	// Handle proper resource deletion via finalizer
	result, err := r.addOrRemoveFinalizer(ctx, provider)
	if result != nil {
		return *result, err
	}

	// Check if resource already exists in the API and only sync the ID
	exists, err := r.isAlreadyExists(ctx, provider)
	if err != nil {
		utils.MarkCondition(provider.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if exists {
		logger.V(9).Info("Provider already exists in the API, running in read-only mode")
		utils.MarkCondition(provider.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionTrue, v1alpha1.ReadonlyConditionReason, v1alpha1.ReadonlyTrueConditionMessage.String())
		return r.handleExistingProvider(ctx, provider)
	}

	// Mark resource as managed by this operator.
	utils.MarkCondition(provider.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")

	err = r.tryAddControllerRef(ctx, provider)
	if err != nil {
		utils.MarkCondition(provider.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Get Provider SHA that can be saved back in the status to check for changes
	changed, sha, err := provider.Diff(ctx, r.toCloudProviderSettingsAttributes, utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate provider SHA")
		utils.MarkCondition(provider.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Sync Provider CRD with the Console API
	apiProvider, err := r.sync(ctx, provider, changed)
	if err != nil {
		logger.Error(err, "unable to create or update provider")
		utils.MarkCondition(provider.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	provider.Status.ID = &apiProvider.ID
	provider.Status.SHA = &sha

	if isProviderReady(apiProvider) {
		utils.MarkCondition(provider.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	} else {
		utils.MarkCondition(provider.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "Not all provider service components are running.")
	}
	utils.MarkCondition(provider.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return requeue, nil
}

func (r *ProviderReconciler) handleExistingProvider(ctx context.Context, provider *v1alpha1.Provider) (reconcile.Result, error) {
	apiProvider, err := r.ConsoleClient.GetProviderByCloud(ctx, provider.Spec.Cloud)
	if err != nil {
		if errors.IsNotFound(err) {
			provider.Status.ID = nil
		}
		return handleRequeue(nil, err, provider.SetCondition)
	}

	provider.Status.ID = &apiProvider.ID
	utils.MarkCondition(provider.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	if isProviderReady(apiProvider) {
		utils.MarkCondition(provider.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	} else {
		utils.MarkCondition(provider.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "Not all provider service components are running.")
	}

	return requeue, nil
}

func (r *ProviderReconciler) isAlreadyExists(ctx context.Context, provider *v1alpha1.Provider) (bool, error) {
	if provider.Status.HasReadonlyCondition() {
		return provider.Status.IsReadonly(), nil
	}

	_, err := r.ConsoleClient.GetProviderByCloud(ctx, provider.Spec.Cloud)
	if errors.IsNotFound(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	if !provider.Status.HasID() {
		log.FromContext(ctx).Info("Provider already exists in the API, running in read-only mode")
		return true, nil
	}

	return false, nil
}

func (r *ProviderReconciler) addOrRemoveFinalizer(ctx context.Context, provider *v1alpha1.Provider) (*ctrl.Result, error) {
	logger := log.FromContext(ctx)

	// If object is not being deleted and if it does not have our finalizer,
	// then lets add the finalizer. This is equivalent to registering our finalizer.
	if provider.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(provider, ProviderProtectionFinalizerName) {
		controllerutil.AddFinalizer(provider, ProviderProtectionFinalizerName)
	}

	// If object is being deleted cleanup and remove the finalizer.
	if !provider.DeletionTimestamp.IsZero() {
		// If object is already being deleted from Console API requeue
		if r.ConsoleClient.IsProviderDeleting(ctx, provider.Status.GetID()) {
			logger.Info("Waiting for provider to be deleted from Console API")
			return &requeue, nil
		}

		exists, err := r.ConsoleClient.IsProviderExists(ctx, provider.Status.GetID())
		if err != nil {
			return &ctrl.Result{}, err
		}

		// Remove Provider from Console API if it exists
		if exists && !provider.Status.IsReadonly() {
			if err = r.ConsoleClient.DeleteProvider(ctx, provider.Status.GetID()); err != nil {
				// if it fails to delete the external dependency here, return with error
				// so that it can be retried.
				utils.MarkCondition(provider.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return &ctrl.Result{}, err
			}

			// If deletion process started requeue so that we can make sure provider
			// has been deleted from Console API before removing the finalizer.
			return &requeue, nil
		}

		// Stop reconciliation as the item is being deleted
		controllerutil.RemoveFinalizer(provider, ProviderProtectionFinalizerName)
		return &ctrl.Result{}, nil
	}

	return nil, nil
}

func (r *ProviderReconciler) sync(ctx context.Context, provider *v1alpha1.Provider, changed bool) (*console.ClusterProviderFragment, error) {
	exists, err := r.ConsoleClient.IsProviderExists(ctx, provider.Status.GetID())
	if err != nil {
		return nil, err
	}

	// Update only if Provider has changed
	if changed && exists {
		attributes, err := provider.UpdateAttributes(ctx, r.toCloudProviderSettingsAttributes)
		if err != nil {
			return nil, err
		}

		return r.ConsoleClient.UpdateProvider(ctx, provider.Status.GetID(), attributes)
	}

	// Read the Provider from Console API if it already exists
	if exists {
		return r.ConsoleClient.GetProvider(ctx, provider.Status.GetID())
	}

	// Create the Provider in Console API if it doesn't exist
	attributes, err := provider.Attributes(ctx, r.toCloudProviderSettingsAttributes)
	if err != nil {
		return nil, err
	}

	return r.ConsoleClient.CreateProvider(ctx, attributes)
}

func (r *ProviderReconciler) tryAddControllerRef(ctx context.Context, provider *v1alpha1.Provider) error {
	secretRef := r.getCloudProviderSettingsSecretRef(provider)
	if secretRef == nil {
		return fmt.Errorf("could not find secret ref configuration for cloud %q", provider.Spec.Cloud)
	}

	secret, err := utils.GetSecret(ctx, r.Client, secretRef)
	if err != nil {
		return err
	}

	return utils.TryAddControllerRef(ctx, r.Client, provider, secret, r.Scheme)
}

func isProviderReady(provider *console.ClusterProviderFragment) bool {
	if provider.Service == nil {
		return true // Retuning true as management cluster will not have any service, and it should be considered as ready.
	}

	for _, component := range provider.Service.Components {
		if component.State == nil || *component.State != console.ComponentStateRunning {
			return false
		}
	}

	return true
}

// SetupWithManager is responsible for initializing new reconciler within provided ctrl.Manager.
func (r *ProviderReconciler) SetupWithManager(mgr ctrl.Manager) error {
	mgr.GetLogger().Info("Starting reconciler", "reconciler", "provider_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.Provider{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Owns(&corev1.Secret{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})).
		Complete(r)
}
