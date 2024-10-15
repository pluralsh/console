package controller

import (
	"context"
	"fmt"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/credentials"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

const OIDCProviderFinalizer = "deployments.plural.sh/oidcprovider-protection"

// OIDCProviderReconciler reconciles a [v1alpha1.OIDCProvider] object
type OIDCProviderReconciler struct {
	client.Client

	Scheme           *runtime.Scheme
	ConsoleClient    consoleclient.ConsoleClient
	CredentialsCache credentials.NamespaceCredentialsCache
}

// SetupWithManager sets up the controller with the Manager.
func (in *OIDCProviderReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).                                                           // Requirement for credentials implementation.
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(in.Client, new(v1alpha1.OIDCProviderList))). // Reconcile objects on credentials change.
		For(&v1alpha1.OIDCProvider{}).
		Complete(in)
}

func (in *OIDCProviderReconciler) Reconcile(ctx context.Context, req reconcile.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	oidcProvider := &v1alpha1.OIDCProvider{}
	if err := in.Get(ctx, req.NamespacedName, oidcProvider); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	utils.MarkCondition(oidcProvider.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	scope, err := NewDefaultScope(ctx, in.Client, oidcProvider)
	if err != nil {
		logger.Error(err, "failed to create oidc provider scope")
		utils.MarkCondition(oidcProvider.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
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
	credentials.SyncCredentialsInfo(oidcProvider, oidcProvider.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(oidcProvider.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	// Mark resource as not ready. This will be overridden in the end.
	utils.MarkCondition(oidcProvider.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	// Handle proper resource deletion via finalizer
	result, err := in.addOrRemoveFinalizer(ctx, oidcProvider)
	if result != nil {
		return *result, err
	}

	// Mark resource as managed by this operator.
	utils.MarkCondition(oidcProvider.SetCondition, v1alpha1.ReadonlyConditionType, metav1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")

	// Get OIDCProvider SHA that can be saved back in the status to check for changes
	changed, sha, err := oidcProvider.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate oidc provider SHA")
		utils.MarkCondition(oidcProvider.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Sync OIDCProvider CRD with the Console API
	apiOidcProvider, err := in.sync(ctx, oidcProvider, changed)
	if err != nil {
		logger.Error(err, "unable to create or update oidc provider")
		utils.MarkCondition(oidcProvider.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	oidcProvider.Status.ID = &apiOidcProvider.ID
	oidcProvider.Status.SHA = &sha

	utils.MarkCondition(oidcProvider.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(oidcProvider.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return ctrl.Result{}, reterr
}

func (in *OIDCProviderReconciler) addOrRemoveFinalizer(ctx context.Context, oidcProvider *v1alpha1.OIDCProvider) (*ctrl.Result, error) {
	logger := log.FromContext(ctx)

	// If object is not being deleted and if it does not have our finalizer,
	// then lets add the finalizer. This is equivalent to registering our finalizer.
	if oidcProvider.ObjectMeta.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(oidcProvider, OIDCProviderFinalizer) {
		controllerutil.AddFinalizer(oidcProvider, OIDCProviderFinalizer)
		return nil, nil
	}

	// If object is being deleted cleanup and remove the finalizer.
	if !oidcProvider.ObjectMeta.DeletionTimestamp.IsZero() {
		// Remove OIDCProvider from Console API if it exists
		exists := in.isAlreadyExists(oidcProvider)

		if exists {
			logger.Info("deleting OIDCProvider")
			if err := in.ConsoleClient.DeleteOIDCProvider(ctx, oidcProvider.Status.GetID(), console.OidcProviderTypePlural); err != nil {
				// if it fails to delete the external dependency here, return with error
				// so that it can be retried.
				utils.MarkCondition(oidcProvider.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return &ctrl.Result{}, err
			}

			// If deletion process started requeue so that we can make sure oidc provider
			// has been deleted from Console API before removing the finalizer.
			return &requeue, nil
		}

		// Stop reconciliation as the item is being deleted
		controllerutil.RemoveFinalizer(oidcProvider, OIDCProviderFinalizer)
		return &ctrl.Result{}, nil
	}

	return nil, nil
}

func (in *OIDCProviderReconciler) sync(ctx context.Context, oidcProvider *v1alpha1.OIDCProvider, changed bool) (*console.OIDCProviderFragment, error) {
	logger := log.FromContext(ctx)
	// Currently only Plural type is supported
	// TODO: parametrize once more types will be supported
	providerType := console.OidcProviderTypePlural
	exists := in.isAlreadyExists(oidcProvider)

	// Update only if OIDCProvider has changed
	if changed && exists {
		logger.Info("updating OIDCProvider")
		return in.ConsoleClient.UpdateOIDCProvider(ctx, oidcProvider.Status.GetID(), providerType, oidcProvider.Attributes())
	}

	// Create the OIDCProvider in Console API if it doesn't exist
	if !exists {
		logger.Info("creating OIDCProvider")
		return in.ConsoleClient.CreateOIDCProvider(ctx, providerType, oidcProvider.Attributes())
	}

	// Return a mocked object with ID as it will be used to sync the status.
	return &console.OIDCProviderFragment{
		ID: oidcProvider.Status.GetID(),
	}, nil
}

func (in *OIDCProviderReconciler) isAlreadyExists(oidcProvider *v1alpha1.OIDCProvider) bool {
	return oidcProvider.Status.HasID()
}
