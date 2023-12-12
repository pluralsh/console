package providerreconciler

import (
	"context"
	"time"

	console "github.com/pluralsh/console-client-go"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/pluralsh/console/controller/apis/deployments/v1alpha1"
	consoleclient "github.com/pluralsh/console/controller/pkg/client"
	"github.com/pluralsh/console/controller/pkg/kubernetes"
	"github.com/pluralsh/console/controller/pkg/utils"
)

// Reconciler reconciles a v1alpha1.Provider object.
// Implements reconcile.Reconciler and types.Controller
type Reconciler struct {
	client.Client

	ConsoleClient consoleclient.ConsoleClient
	Scheme        *runtime.Scheme
}

const (
	RequeueAfter  = 30 * time.Second
	FinalizerName = "providers.deployments.plural.sh/finalizer"
)

var (
	requeue = ctrl.Result{RequeueAfter: RequeueAfter}
)

// Reconcile ...
// TODO: Add kubebuilder rbac annotation
func (r *Reconciler) Reconcile(ctx context.Context, req reconcile.Request) (reconcile.Result, error) {
	log := log.FromContext(ctx)

	// Read Provider CRD from the K8S API
	var provider v1alpha1.Provider
	if err := r.Get(ctx, req.NamespacedName, &provider); err != nil {
		log.Error(err, "unable to fetch provider")
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	// Check if resource already exists in the API and only sync the ID
	exists, err := r.isAlreadyExists(ctx, provider)
	if err != nil {
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
		return ctrl.Result{}, nil
	}

	// Get Provider SHA that can be saved back in the status to check for changes
	changed, sha, err := provider.Diff(ctx, r.toCloudProviderSettingsAttributes, utils.HashObject)
	if err != nil {
		log.Error(err, "unable to calculate provider SHA")
		return ctrl.Result{}, err
	}

	// Sync Provider CRD with the Console API
	apiProvider, err := r.updateOrGetProvider(ctx, provider, changed)
	if err != nil {
		log.Error(err, "unable to create or update provider")
		return ctrl.Result{}, err
	}

	// Sync back Provider to crd status
	if err = utils.TryUpdateStatus[*v1alpha1.Provider](ctx, r.Client, &provider, func(p *v1alpha1.Provider, original *v1alpha1.Provider) (any, any) {
		p.Status.ID = &apiProvider.ID
		p.Status.SHA = &sha
		p.Status.Existing = lo.ToPtr(false)

		return original.Status, p.Status
	}); err != nil {
		return ctrl.Result{}, err
	}

	return requeue, nil
}

func (r *Reconciler) handleExistingProvider(ctx context.Context, provider v1alpha1.Provider) (reconcile.Result, error) {
	apiProvider, err := r.ConsoleClient.GetProviderByCloud(ctx, provider.Spec.Cloud)
	if err != nil {
		return ctrl.Result{}, err
	}

	if err = utils.TryUpdateStatus[*v1alpha1.Provider](ctx, r.Client, &provider, func(p *v1alpha1.Provider, original *v1alpha1.Provider) (any, any) {
		p.Status.ID = &apiProvider.ID
		p.Status.Existing = lo.ToPtr(true)

		return original.Status, p.Status
	}); err != nil {
		return ctrl.Result{}, err
	}

	return requeue, nil
}

func (r *Reconciler) isAlreadyExists(ctx context.Context, provider v1alpha1.Provider) (bool, error) {
	if provider.Status.IsExisting() {
		return true, nil
	}

	_, err := r.ConsoleClient.GetProviderByCloud(ctx, provider.Spec.Cloud)
	if errors.IsNotFound(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return !provider.Status.HasID(), nil
}

func (r *Reconciler) addOrRemoveFinalizer(ctx context.Context, provider v1alpha1.Provider) (*ctrl.Result, error) {
	// If object is not being deleted, so if it does not have our finalizer,
	// then lets add the finalizer and update the object. This is equivalent
	// to registering our finalizer.
	if provider.ObjectMeta.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(&provider, FinalizerName) {
		controllerutil.AddFinalizer(&provider, FinalizerName)
		if err := r.Update(ctx, &provider); err != nil {
			return &ctrl.Result{}, err
		}
	}

	// If object is being deleted
	if !provider.ObjectMeta.DeletionTimestamp.IsZero() {
		// If object is already being deleted from Console API requeue
		if r.ConsoleClient.IsProviderDeleting(ctx, provider.Status.GetID()) {
			return &requeue, nil
		}

		// Remove Provider from Console API if it exists
		if r.ConsoleClient.IsProviderExists(ctx, provider.Status.GetID()) {
			if err := r.ConsoleClient.DeleteProvider(ctx, provider.Status.GetID()); err != nil {
				// if fail to delete the external dependency here, return with error
				// so that it can be retried.
				return &ctrl.Result{}, err
			}
		}

		// If our finalizer is present, remove it
		if controllerutil.ContainsFinalizer(&provider, FinalizerName) {
			controllerutil.RemoveFinalizer(&provider, FinalizerName)
			if err := r.Update(ctx, &provider); err != nil {
				return &ctrl.Result{}, err
			}
		}

		// Stop reconciliation as the item is being deleted
		return &ctrl.Result{}, nil
	}

	return nil, nil
}

func (r *Reconciler) updateOrGetProvider(ctx context.Context, provider v1alpha1.Provider, changed bool) (*console.ClusterProviderFragment, error) {
	exists := r.ConsoleClient.IsProviderExists(ctx, provider.Status.GetID())

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

// SetupWithManager is responsible for initializing new reconciler within provided ctrl.Manager.
func (r *Reconciler) SetupWithManager(mgr ctrl.Manager) error {
	mgr.GetLogger().Info("starting reconciler", "reconciler", "provider_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.Provider{}).
		Complete(r)
}

func (r *Reconciler) tryAddControllerRef(ctx context.Context, provider v1alpha1.Provider) error {
	secretRef := r.getCloudProviderSettingsSecretRef(provider)
	secret, err := kubernetes.GetSecret(ctx, r.Client, secretRef)
	if err != nil {
		return err
	}

	return utils.TryAddControllerRef(ctx, r.Client, &provider, secret, r.Scheme)
}
