package controller

import (
	"context"
	"fmt"

	console "github.com/pluralsh/console-client-go"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/pluralsh/console/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/controller/internal/client"
	"github.com/pluralsh/console/controller/internal/utils"
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
// +kubebuilder:rbac:groups=core,resources=secrets,verbs=get;list

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the v1alpha1.Provider closer to the desired state
// and syncs it with the Console API state.
func (r *ProviderReconciler) Reconcile(ctx context.Context, req reconcile.Request) (_ reconcile.Result, reterr error) {
	log := log.FromContext(ctx)
	log.Info("Reconciling")

	// Read Provider CRD from the K8S API
	provider := new(v1alpha1.Provider)
	if err := r.Get(ctx, req.NamespacedName, provider); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := NewProviderScope(ctx, r.Client, provider)
	if err != nil {
		log.Error(err, "failed to create scope")
		utils.MarkCondition(provider.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	// Check if resource already exists in the API and only sync the ID
	exists, err := r.isAlreadyExists(ctx, provider)
	if err != nil {
		utils.MarkCondition(provider.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}
	if exists {
		return r.handleExistingProvider(ctx, provider)
	}

	// Handle proper resource deletion via finalizer
	result, err := r.addOrRemoveFinalizer(ctx, provider)
	if result != nil {
		return *result, err
	}

	err = r.tryAddControllerRef(ctx, provider)
	if err != nil {
		utils.MarkCondition(provider.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	// Get Provider SHA that can be saved back in the status to check for changes
	changed, sha, err := provider.Diff(ctx, r.toCloudProviderSettingsAttributes, utils.HashObject)
	if err != nil {
		log.Error(err, "unable to calculate provider SHA")
		utils.MarkCondition(provider.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	// Sync Provider CRD with the Console API
	apiProvider, err := r.sync(ctx, provider, changed)
	if err != nil {
		log.Error(err, "unable to create or update provider")
		utils.MarkCondition(provider.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	provider.Status.ID = &apiProvider.ID
	provider.Status.SHA = &sha
	utils.MarkCondition(provider.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")
	utils.MarkCondition(provider.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return requeue, nil
}

func (r *ProviderReconciler) handleExistingProvider(ctx context.Context, provider *v1alpha1.Provider) (reconcile.Result, error) {
	apiProvider, err := r.ConsoleClient.GetProviderByCloud(ctx, provider.Spec.Cloud)
	if err != nil {
		utils.MarkCondition(provider.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	provider.Status.ID = &apiProvider.ID
	utils.MarkCondition(provider.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionTrue, v1alpha1.ReadonlyConditionReason, v1alpha1.ReadonlyTrueConditionMessage.String())
	utils.MarkCondition(provider.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

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
	log := log.FromContext(ctx)

	// If object is not being deleted and if it does not have our finalizer,
	// then lets add the finalizer. This is equivalent to registering our finalizer.
	if provider.ObjectMeta.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(provider, ProviderProtectionFinalizerName) {
		controllerutil.AddFinalizer(provider, ProviderProtectionFinalizerName)
	}

	// If object is being deleted cleanup and remove the finalizer.
	if !provider.ObjectMeta.DeletionTimestamp.IsZero() {
		// If object is already being deleted from Console API requeue
		if r.ConsoleClient.IsProviderDeleting(ctx, provider.Status.GetID()) {
			log.Info("Waiting for provider to be deleted from Console API")
			return &requeue, nil
		}

		// Remove Provider from Console API if it exists
		if r.ConsoleClient.IsProviderExists(ctx, provider.Status.GetID()) {
			log.Info("Deleting provider")
			if err := r.ConsoleClient.DeleteProvider(ctx, provider.Status.GetID()); err != nil {
				// if it fails to delete the external dependency here, return with error
				// so that it can be retried.
				utils.MarkCondition(provider.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
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
	log := log.FromContext(ctx)
	exists := r.ConsoleClient.IsProviderExists(ctx, provider.Status.GetID())

	// Update only if Provider has changed
	if changed && exists {
		attributes, err := provider.UpdateAttributes(ctx, r.toCloudProviderSettingsAttributes)
		if err != nil {
			return nil, err
		}

		log.Info("Updating provider")
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

	log.Info("Creating provider")
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

// SetupWithManager is responsible for initializing new reconciler within provided ctrl.Manager.
func (r *ProviderReconciler) SetupWithManager(mgr ctrl.Manager) error {
	mgr.GetLogger().Info("Starting reconciler", "reconciler", "provider_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.Provider{}).
		Owns(&corev1.Secret{}).
		Complete(r)
}
