package controller

import (
	"context"
	"fmt"

	"github.com/samber/lo"
	v1 "k8s.io/api/core/v1"
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

const ObservabilityProviderFinalizer = "deployments.plural.sh/observabilityprovider-protection"

// ObservabilityProviderReconciler reconciles a [v1alpha1.ObservabilityProvider] object
type ObservabilityProviderReconciler struct {
	client.Client

	Scheme           *runtime.Scheme
	ConsoleClient    consoleclient.ConsoleClient
	CredentialsCache credentials.NamespaceCredentialsCache
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=observabilityproviders,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=observabilityproviders/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=observabilityproviders/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the observability provider closer to the desired state.
func (in *ObservabilityProviderReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := log.FromContext(ctx)

	provider := &v1alpha1.ObservabilityProvider{}
	if err := in.Get(ctx, req.NamespacedName, provider); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	utils.MarkCondition(provider.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	scope, err := NewDefaultScope(ctx, in.Client, provider)
	if err != nil {
		logger.Error(err, "failed to create observability provider scope")
		utils.MarkCondition(provider.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
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
	credentials.SyncCredentialsInfo(provider, provider.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(provider.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	// Mark resource as not ready. This will be overridden in the end.
	utils.MarkCondition(provider.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	// Handle proper resource deletion via finalizer
	result, err := in.addOrRemoveFinalizer(ctx, provider)
	if result != nil {
		return *result, err
	}

	// Check if resource already exists in the API and only sync the ID
	exists, err := in.isAlreadyExists(ctx, provider)
	if err != nil {
		utils.MarkCondition(provider.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if exists {
		utils.MarkCondition(provider.SetCondition, v1alpha1.ReadonlyConditionType, metav1.ConditionTrue, v1alpha1.ReadonlyConditionReason, v1alpha1.ReadonlyTrueConditionMessage.String())
		return in.handleExistingProvider(ctx, provider)
	}

	// Mark resource as managed by this operator.
	utils.MarkCondition(provider.SetCondition, v1alpha1.ReadonlyConditionType, metav1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")

	// Get ObservabilityProvider SHA that can be saved back in the status to check for changes
	changed, sha, err := provider.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate observability provider SHA")
		utils.MarkCondition(provider.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Sync ObservabilityProvider CRD with the Console API
	apiProvider, err := in.sync(ctx, provider, changed)
	if err != nil {
		logger.Error(err, "unable to create or update observability provider")
		utils.MarkCondition(provider.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	provider.Status.ID = &apiProvider.ID
	provider.Status.SHA = &sha

	utils.MarkCondition(provider.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(provider.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return ctrl.Result{}, reterr
}

// SetupWithManager sets up the controller with the Manager.
func (in *ObservabilityProviderReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).                                                                    // Requirement for credentials implementation.
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(in.Client, new(v1alpha1.ObservabilityProviderList))). // Reconcile objects on credentials change.
		For(&v1alpha1.ObservabilityProvider{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(in)
}

func (in *ObservabilityProviderReconciler) addOrRemoveFinalizer(ctx context.Context, provider *v1alpha1.ObservabilityProvider) (*ctrl.Result, error) {
	// If object is not being deleted and if it does not have our finalizer,
	// then lets add the finalizer. This is equivalent to registering our finalizer.
	if provider.ObjectMeta.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(provider, ObservabilityProviderFinalizer) {
		controllerutil.AddFinalizer(provider, ObservabilityProviderFinalizer)
		return nil, nil
	}

	// If object is being deleted cleanup and remove the finalizer.
	if !provider.ObjectMeta.DeletionTimestamp.IsZero() {
		// Remove ObservabilityProvider from Console API if it exists
		exists, err := in.ConsoleClient.IsObservabilityProviderExists(ctx, provider.ConsoleName())
		if err != nil {
			return &ctrl.Result{}, err
		}

		if exists && !provider.Status.IsReadonly() {
			if err := in.ConsoleClient.DeleteObservabilityProvider(ctx, provider.Status.GetID()); err != nil {
				// if it fails to delete the external dependency here, return with error
				// so that it can be retried.
				utils.MarkCondition(provider.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return &ctrl.Result{}, err
			}

			// If deletion process started requeue so that we can make sure observability provider
			// has been deleted from Console API before removing the finalizer.
			return &requeue, nil
		}

		// Stop reconciliation as the item is being deleted
		controllerutil.RemoveFinalizer(provider, ObservabilityProviderFinalizer)
		return &ctrl.Result{}, nil
	}

	return nil, nil
}

func (in *ObservabilityProviderReconciler) isAlreadyExists(ctx context.Context, provider *v1alpha1.ObservabilityProvider) (bool, error) {
	if provider.Status.HasReadonlyCondition() {
		return provider.Status.IsReadonly(), nil
	}

	exists, err := in.ConsoleClient.IsObservabilityProviderExists(ctx, provider.ConsoleName())
	if err != nil {
		return false, err
	}

	if !exists {
		return false, nil
	}

	return !provider.Status.HasID(), nil
}

func (in *ObservabilityProviderReconciler) sync(
	ctx context.Context,
	provider *v1alpha1.ObservabilityProvider,
	changed bool,
) (*console.ObservabilityProviderFragment, error) {
	exists, err := in.ConsoleClient.IsObservabilityProviderExists(ctx, provider.ConsoleName())
	if err != nil {
		return nil, err
	}

	// Read the ObservabilityProvider from Console API if it already exists and has not changed
	if exists && !changed {
		return in.ConsoleClient.GetObservabilityProvider(ctx, nil, lo.ToPtr(provider.ConsoleName()))
	}

	// Create/Update the ObservabilityProvider in Console API if it doesn't exist
	c, err := in.credentials(ctx, provider)
	if err != nil {
		return nil, err
	}

	return in.ConsoleClient.UpsertObservabilityProvider(ctx, provider.Attributes(c))
}

func (in *ObservabilityProviderReconciler) handleExistingProvider(ctx context.Context, provider *v1alpha1.ObservabilityProvider) (ctrl.Result, error) {
	exists, err := in.ConsoleClient.IsObservabilityProviderExists(ctx, provider.ConsoleName())
	if err != nil {
		return ctrl.Result{}, err
	}

	if !exists {
		provider.Status.ID = nil
		utils.MarkCondition(provider.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonNotFound, v1alpha1.SynchronizedNotFoundConditionMessage.String())
		return ctrl.Result{}, nil
	}

	apiProvider, err := in.ConsoleClient.GetObservabilityProvider(ctx, nil, lo.ToPtr(provider.ConsoleName()))
	if err != nil {
		utils.MarkCondition(provider.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	provider.Status.ID = &apiProvider.ID

	utils.MarkCondition(provider.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(provider.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return requeue, nil
}

func (in *ObservabilityProviderReconciler) credentials(
	ctx context.Context,
	provider *v1alpha1.ObservabilityProvider,
) (_ console.ObservabilityProviderCredentialsAttributes, err error) {
	var datadog *console.DatadogCredentialsAttributes
	var newrelic *console.NewRelicCredentialsAttributes

	if provider.Spec.Credentials == nil {
		return console.ObservabilityProviderCredentialsAttributes{}, fmt.Errorf("no credentials provided")
	}

	switch provider.Spec.Type {
	case console.ObservabilityProviderTypeDatadog:
		datadog, err = in.datadogCredentials(ctx, provider.Spec.Credentials.Datadog)
	case console.ObservabilityProviderTypeNewrelic:
		newrelic, err = in.newrelicCredentials(ctx, provider.Spec.Credentials.Datadog)
	}

	return console.ObservabilityProviderCredentialsAttributes{
		Datadog:  datadog,
		Newrelic: newrelic,
	}, err
}

func (in *ObservabilityProviderReconciler) datadogCredentials(ctx context.Context, secretRef *v1.SecretReference) (*console.DatadogCredentialsAttributes, error) {
	secret, err := utils.GetSecret(ctx, in.Client, secretRef)
	if err != nil {
		return nil, err
	}

	apiKey := string(secret.Data["apiKey"])
	appKey := string(secret.Data["appKey"])
	if apiKey == "" || appKey == "" {
		return nil, fmt.Errorf("missing/empty 'apiKey' or 'appKey' entry in a secret")
	}

	return &console.DatadogCredentialsAttributes{
		APIKey: apiKey,
		AppKey: appKey,
	}, nil
}

func (in *ObservabilityProviderReconciler) newrelicCredentials(ctx context.Context, secretRef *v1.SecretReference) (*console.NewRelicCredentialsAttributes, error) {
	secret, err := utils.GetSecret(ctx, in.Client, secretRef)
	if err != nil {
		return nil, err
	}

	apiKey := string(secret.Data["apiKey"])
	if apiKey == "" {
		return nil, fmt.Errorf("missing/empty 'apiKey' entry in a secret")
	}

	return &console.NewRelicCredentialsAttributes{
		APIKey: apiKey,
	}, nil
}
