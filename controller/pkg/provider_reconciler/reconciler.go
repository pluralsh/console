package providerreconciler

import (
	"context"
	"fmt"
	console "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/console/controller/apis/deployments/v1alpha1"
	consoleclient "github.com/pluralsh/console/controller/pkg/client"
	"github.com/pluralsh/console/controller/pkg/utils"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/util/retry"
	"reflect"
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
func (r *Reconciler) Reconcile(ctx context.Context, req reconcile.Request) (reconcile.Result, error) {
	log := log.FromContext(ctx)

	// Read Provider CRD from the K8S API
	var provider v1alpha1.Provider
	if err := r.Get(ctx, req.NamespacedName, &provider); err != nil {
		log.Error(err, "unable to fetch provider")
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	// Handle resource deletion
	result, err := r.addOrRemoveFinalizer(ctx, provider)
	if result != nil {
		return *result, err
	}

	// Get Provider SHA that can be saved back in the status to check for changes
	_, sha, err := provider.Diff(ctx, r.toCloudProviderSettingsAttributes, utils.HashObject)
	if err != nil {
		log.Error(err, "unable to calculate provider SHA")
		return ctrl.Result{}, err
	}

	// Sync Provider CRD with the Console API
	apiProvider, err := r.updateOrGetProvider(ctx, provider)
	if err != nil {
		log.Error(err, "unable to create or update provider")
		return ctrl.Result{}, err
	}

	// Sync back Provider to crd status
	if err = r.updateStatus(ctx, &provider, func(p *v1alpha1.Provider) {
		p.Status.ID = &apiProvider.ID
		p.Status.SHA = &sha
	}); err != nil {
		return ctrl.Result{}, err
	}

	return requeue, nil
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

func (r *Reconciler) updateOrGetProvider(ctx context.Context, provider v1alpha1.Provider) (*console.ClusterProviderFragment, error) {
	changed, _, _ := provider.Diff(ctx, r.toCloudProviderSettingsAttributes, utils.HashObject)
	exists := r.ConsoleClient.IsProviderExists(ctx, provider.Status.GetID())

	// Update only if Provider has changed
	if changed && exists {
		attributes, err := provider.Spec.UpdateAttributes(ctx, r.toCloudProviderSettingsAttributes)
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
	attributes, err := provider.Spec.Attributes(ctx, r.toCloudProviderSettingsAttributes)
	if err != nil {
		return nil, err
	}

	return r.ConsoleClient.CreateProvider(ctx, attributes)
}

func (r *Reconciler) updateStatus(ctx context.Context, provider *v1alpha1.Provider, patch func(provider *v1alpha1.Provider)) error {
	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		if err := r.Get(ctx, client.ObjectKeyFromObject(provider), provider); err != nil {
			return fmt.Errorf("could not fetch current provider state, got error: %+v", err)
		}

		original := provider.DeepCopy()
		patch(provider)

		if reflect.DeepEqual(original.Status, provider.Status) {
			return nil
		}

		return r.Client.Status().Patch(ctx, provider, client.MergeFrom(original))
	})
}

// SetupWithManager is responsible for initializing new reconciler within provided ctrl.Manager.
func (r *Reconciler) SetupWithManager(mgr ctrl.Manager) error {
	mgr.GetLogger().Info("starting reconciler", "reconciler", "provider_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.Provider{}).
		Complete(r)
}
