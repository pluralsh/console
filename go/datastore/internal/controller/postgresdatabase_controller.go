package controller

import (
	"context"
	"fmt"

	"github.com/pluralsh/console/go/datastore/internal/client/postgres"
	"github.com/pluralsh/console/go/datastore/internal/utils"
	"k8s.io/apimachinery/pkg/api/meta"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	"github.com/pluralsh/console/go/datastore/api/v1alpha1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	PostgresDatabaseProtectionFinalizerName = "projects.deployments.plural.sh/postgres-database-protection"
)

// PostgresDatabaseReconciler reconciles a PostgresDatabase object
type PostgresDatabaseReconciler struct {
	client.Client
	Scheme         *runtime.Scheme
	PostgresClient postgres.Client
}

//+kubebuilder:rbac:groups=dbs.plural.sh,resources=postgresdatabases,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=dbs.plural.sh,resources=postgresdatabases/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=dbs.plural.sh,resources=postgresdatabases/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *PostgresDatabaseReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, retErr error) {
	logger := ctrl.LoggerFrom(ctx)

	db := new(v1alpha1.PostgresDatabase)
	if err := r.Get(ctx, req.NamespacedName, db); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	utils.MarkCondition(db.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	scope, err := NewDefaultScope(ctx, r.Client, db)
	if err != nil {
		logger.V(5).Info(err.Error())
		utils.MarkCondition(db.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && retErr == nil {
			retErr = err
		}
	}()

	if !db.DeletionTimestamp.IsZero() {
		if err = r.handleDelete(ctx, db); err != nil {
			return ctrl.Result{}, err
		}
		return ctrl.Result{}, nil
	}

	credentials := new(v1alpha1.PostgresCredentials)
	if err := r.Get(ctx, types.NamespacedName{Name: db.Spec.CredentialsRef.Name, Namespace: db.Namespace}, credentials); err != nil {
		logger.V(5).Info(err.Error())
		return handleRequeue(nil, err, db.SetCondition)
	}

	if err := r.addOrRemoveFinalizer(ctx, db, credentials); err != nil {
		utils.MarkCondition(db.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	if !meta.IsStatusConditionTrue(credentials.Status.Conditions, v1alpha1.ReadyConditionType.String()) {
		err := fmt.Errorf("unauthorized or unhealthy Postgres")
		logger.V(5).Info(err.Error())
		utils.MarkCondition(db.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return waitForResources, nil
	}

	if err = r.PostgresClient.Init(ctx, r.Client, credentials); err != nil {
		logger.Error(err, "failed to create Postgres client")
		utils.MarkCondition(db.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	if err := r.PostgresClient.UpsertDatabase(db.DatabaseName()); err != nil {
		logger.Error(err, "failed to create database")
		utils.MarkCondition(db.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	utils.MarkCondition(db.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(db.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return ctrl.Result{}, nil
}

func (r *PostgresDatabaseReconciler) addOrRemoveFinalizer(ctx context.Context, database *v1alpha1.PostgresDatabase, credentials *v1alpha1.PostgresCredentials) error {
	if database.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(database, PostgresDatabaseProtectionFinalizerName) {
		controllerutil.AddFinalizer(database, PostgresDatabaseProtectionFinalizerName)
		if err := utils.TryAddFinalizer(ctx, r.Client, credentials, PostgresDatabaseProtectionFinalizerName); err != nil {
			return err
		}
	}
	return nil
}

func (r *PostgresDatabaseReconciler) handleDelete(ctx context.Context, database *v1alpha1.PostgresDatabase) error {
	credentials := new(v1alpha1.PostgresCredentials)
	err := r.Get(ctx, types.NamespacedName{Name: database.Spec.CredentialsRef.Name, Namespace: database.Namespace}, credentials)

	if err != nil || !meta.IsStatusConditionTrue(credentials.Status.Conditions, v1alpha1.ReadyConditionType.String()) {
		controllerutil.RemoveFinalizer(database, PostgresDatabaseProtectionFinalizerName)
		return nil
	}

	if err := r.PostgresClient.Init(ctx, r.Client, credentials); err != nil {
		return err
	}

	if err := r.PostgresClient.DeleteDatabase(database.DatabaseName()); err != nil {
		return err
	}

	controllerutil.RemoveFinalizer(database, PostgresDatabaseProtectionFinalizerName)
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *PostgresDatabaseReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.PostgresDatabase{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}
