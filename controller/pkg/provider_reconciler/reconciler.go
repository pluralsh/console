package providerreconciler

import (
	"context"
	console "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/console/controller/apis/deployments/v1alpha1"
	consoleclient "github.com/pluralsh/console/controller/pkg/client"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
	"time"
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
func (p *Reconciler) Reconcile(ctx context.Context, req reconcile.Request) (reconcile.Result, error) {
	log := log.FromContext(ctx)

	// Read Provider CRD from the K8S API
	var provider v1alpha1.Provider
	if err := p.Get(ctx, req.NamespacedName, &provider); err != nil {
		log.Error(err, "unable to fetch provider")
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	// Handle resource deletion
	ret, err := p.addOrRemoveFinalizer(ctx, provider)
	if ret || err != nil {
		return ctrl.Result{}, err
	}

	// Sync Provider CRD with the Console API
	apiProvider, err := p.createOrUpdateProvider(ctx, provider)
	if err != nil {
		log.Error(err, "unable to create or update provider")
		return ctrl.Result{}, err
	}

	// Sync back Provider ID to crd
	provider.Status.ID = &apiProvider.ID
	// TODO: update CRD status

	return requeue, nil
}

func (p *Reconciler) createOrUpdateProvider(ctx context.Context, provider v1alpha1.Provider) (*console.ClusterProviderFragment, error) {
	// TODO: Read credential secrets and attributes

	if provider.Status.HasID() && p.ConsoleClient.IsProviderExists(ctx, provider.Status.GetID()) {
		return p.ConsoleClient.UpdateProvider(ctx, provider.Status.GetID(), console.ClusterProviderUpdateAttributes{})
	}

	return p.ConsoleClient.CreateProvider(ctx, console.ClusterProviderAttributes{})
}

func (p *Reconciler) addOrRemoveFinalizer(ctx context.Context, provider v1alpha1.Provider) (bool, error) {
	// If object is not being deleted, so if it does not have our finalizer,
	// then lets add the finalizer and update the object. This is equivalent
	// to registering our finalizer.
	if provider.ObjectMeta.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(&provider, FinalizerName) {
		controllerutil.AddFinalizer(&provider, FinalizerName)
		if err := p.Update(ctx, &provider); err != nil {
			return true, err
		}
	}

	// If object is being deleted
	if !provider.ObjectMeta.DeletionTimestamp.IsZero() {
		// Remove Provider from Console API if it exists
		if p.ConsoleClient.IsProviderExists(ctx, provider.Status.GetID()) {
			if err := p.ConsoleClient.DeleteProvider(ctx, provider.Status.GetID()); err != nil {
				// if fail to delete the external dependency here, return with error
				// so that it can be retried.
				return true, err
			}
		}

		// If our finalizer is present, remove it
		if controllerutil.ContainsFinalizer(&provider, FinalizerName) {
			controllerutil.RemoveFinalizer(&provider, FinalizerName)
			if err := p.Update(ctx, &provider); err != nil {
				return true, err
			}
		}

		// Stop reconciliation as the item is being deleted
		return true, nil
	}

	return false, nil
}

// SetupWithManager is responsible for initializing new reconciler within provided ctrl.Manager.
func (p *Reconciler) SetupWithManager(mgr ctrl.Manager) error {
	mgr.GetLogger().Info("starting reconciler", "reconciler", "provider_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.Provider{}).
		Complete(p)
}
