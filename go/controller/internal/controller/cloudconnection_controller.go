package controller

import (
	"context"
	"fmt"

	"github.com/pluralsh/console/go/controller/internal/common"
	"github.com/samber/lo"
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

const (
	// CloudConnectionProtectionFinalizerName defines name for the main finalizer that synchronizes
	// resource deletion from the Console API prior to removing the CRD.
	CloudConnectionProtectionFinalizerName = "providers.deployments.plural.sh/cloud-connection-protection"
)

// CloudConnectionReconciler reconciles a CloudConnection object
type CloudConnectionReconciler struct {
	client.Client
	ConsoleClient consoleclient.ConsoleClient
	Scheme        *runtime.Scheme
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=cloudconnections,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=cloudconnections/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=cloudconnections/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
func (r *CloudConnectionReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	connection := new(v1alpha1.CloudConnection)
	if err := r.Get(ctx, req.NamespacedName, connection); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := common.NewDefaultScope(ctx, r.Client, connection)
	if err != nil {
		logger.Error(err, "failed to create scope")
		return ctrl.Result{}, err
	}
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	utils.MarkCondition(connection.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	// Handle proper resource deletion via finalizer
	result, err := r.addOrRemoveFinalizer(ctx, connection)
	if result != nil {
		return *result, err
	}

	// Check if resource already exists in the API and only sync the ID
	exists, err := r.isAlreadyExists(ctx, connection)
	if err != nil {
		return common.HandleRequeue(nil, err, connection.SetCondition)
	}
	if exists {
		logger.V(9).Info("CloudConnection already exists in the API, running in read-only mode")
		utils.MarkCondition(connection.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionTrue, v1alpha1.ReadonlyConditionReason, v1alpha1.ReadonlyTrueConditionMessage.String())
		return r.handleExistingConnection(ctx, connection)
	}

	// Mark resource as managed by this operator.
	utils.MarkCondition(connection.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")
	err = r.tryAddControllerRef(ctx, connection)
	if err != nil {
		return common.HandleRequeue(nil, err, connection.SetCondition)
	}

	// Get Connection SHA that can be saved back in the status to check for changes
	changed, sha, err := connection.Diff(ctx, r.toCloudConnectionAttributes, utils.HashObject)
	if err != nil {
		return common.HandleRequeue(nil, err, connection.SetCondition)
	}

	apiConnection, err := r.sync(ctx, connection, changed)
	if err != nil {
		return common.HandleRequeue(nil, err, connection.SetCondition)
	}

	connection.Status.ID = &apiConnection.ID
	connection.Status.SHA = &sha

	utils.MarkCondition(connection.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(connection.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return connection.Spec.Reconciliation.Requeue(), nil
}

func (r *CloudConnectionReconciler) sync(ctx context.Context, connection *v1alpha1.CloudConnection, changed bool) (*console.CloudConnectionFragment, error) {
	if !changed {
		return r.ConsoleClient.GetCloudConnection(ctx, connection.Status.ID, nil)
	}
	attr, err := r.toCloudConnectionAttributes(ctx, *connection)
	if err != nil {
		return nil, err
	}

	attr.Name = connection.CloudConnectionName()

	attr.ReadBindings, err = common.BindingsAttributes(connection.Spec.ReadBindings)
	if err != nil {
		return nil, err
	}

	return r.ConsoleClient.UpsertCloudConnection(ctx, *attr)
}

func (r *CloudConnectionReconciler) tryAddControllerRef(ctx context.Context, connection *v1alpha1.CloudConnection) error {
	secretRef := r.getProviderSettingsSecretRef(connection.Spec)
	if secretRef.Name == "" || secretRef.Namespace == "" || secretRef.Key == "" {
		return fmt.Errorf("the provider configuration secret ref for provider %q is incorrect", connection.Spec.Provider)
	}

	secret, err := utils.GetSecret(ctx, r.Client, &corev1.SecretReference{Name: secretRef.Name, Namespace: secretRef.Namespace})
	if err != nil {
		return err
	}

	return utils.TryAddControllerRef(ctx, r.Client, connection, secret, r.Scheme)
}

func (r *CloudConnectionReconciler) handleExistingConnection(ctx context.Context, connection *v1alpha1.CloudConnection) (reconcile.Result, error) {
	apiConnection, err := r.ConsoleClient.GetCloudConnection(ctx, nil, lo.ToPtr(connection.CloudConnectionName()))
	if err != nil {
		if errors.IsNotFound(err) {
			connection.Status.ID = nil
		}
		return common.HandleRequeue(nil, err, connection.SetCondition)
	}

	connection.Status.ID = &apiConnection.ID
	utils.MarkCondition(connection.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(connection.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return connection.Spec.Reconciliation.Requeue(), nil
}

func (r *CloudConnectionReconciler) isAlreadyExists(ctx context.Context, connection *v1alpha1.CloudConnection) (bool, error) {
	if connection.Status.HasReadonlyCondition() {
		return connection.Status.IsReadonly(), nil
	}

	_, err := r.ConsoleClient.GetCloudConnection(ctx, nil, lo.ToPtr(connection.CloudConnectionName()))
	if errors.IsNotFound(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	if !connection.Status.HasID() {
		log.FromContext(ctx).Info("CloudConnection already exists in the API, running in read-only mode")
		return true, nil
	}

	return false, nil
}

func (r *CloudConnectionReconciler) addOrRemoveFinalizer(ctx context.Context, connection *v1alpha1.CloudConnection) (*ctrl.Result, error) {
	// If object is not being deleted and if it does not have our finalizer,
	// then lets add the finalizer. This is equivalent to registering our finalizer.
	if connection.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(connection, CloudConnectionProtectionFinalizerName) {
		controllerutil.AddFinalizer(connection, CloudConnectionProtectionFinalizerName)
	}

	// If object is being deleted cleanup and remove the finalizer.
	if !connection.DeletionTimestamp.IsZero() {
		exists, err := r.ConsoleClient.IsCloudConnection(ctx, connection.CloudConnectionName())
		if err != nil {
			if errors.IsNotFound(err) {
				controllerutil.RemoveFinalizer(connection, CloudConnectionProtectionFinalizerName)
				return &ctrl.Result{}, nil
			}
			return &ctrl.Result{}, err
		}

		// Remove Provider from Console API if it exists
		if exists && !connection.Status.IsReadonly() {
			if err = r.ConsoleClient.DeleteCloudConnection(ctx, connection.Status.GetID()); err != nil {
				// if it fails to delete the external dependency here, return with error
				// so that it can be retried.
				utils.MarkCondition(connection.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return &ctrl.Result{}, err
			}

			// If deletion process started requeue so that we can make sure connection
			// has been deleted from Console API before removing the finalizer.
			return lo.ToPtr(common.Wait()), nil
		}

		// Stop reconciliation as the item is being deleted
		controllerutil.RemoveFinalizer(connection, CloudConnectionProtectionFinalizerName)
		return &ctrl.Result{}, nil
	}

	return nil, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *CloudConnectionReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.CloudConnection{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Owns(&corev1.Secret{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})).
		Complete(r)
}
