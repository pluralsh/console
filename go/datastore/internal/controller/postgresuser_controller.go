package controller

import (
	"context"
	"fmt"
	"strings"

	"github.com/pluralsh/console/go/datastore/internal/client/postgres"
	"github.com/pluralsh/console/go/datastore/internal/utils"
	"github.com/pluralsh/polly/containers"
	corev1 "k8s.io/api/core/v1"
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
	PostgresUserProtectionFinalizerName = "projects.deployments.plural.sh/postgres-user-protection"
)

// PostgresUserReconciler reconciles a PostgresUser object
type PostgresUserReconciler struct {
	client.Client
	Scheme         *runtime.Scheme
	PostgresClient postgres.Client
}

//+kubebuilder:rbac:groups=dbs.plural.sh,resources=postgresusers,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=dbs.plural.sh,resources=postgresusers/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=dbs.plural.sh,resources=postgresusers/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *PostgresUserReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, retErr error) {
	logger := ctrl.LoggerFrom(ctx)

	user := new(v1alpha1.PostgresUser)
	if err := r.Get(ctx, req.NamespacedName, user); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	utils.MarkCondition(user.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	scope, err := NewDefaultScope(ctx, r.Client, user)
	if err != nil {
		logger.V(5).Info(err.Error())
		utils.MarkCondition(user.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); client.IgnoreNotFound(err) != nil && retErr == nil {
			retErr = err
		}
	}()

	if !user.DeletionTimestamp.IsZero() {
		result, err := r.handleDelete(ctx, user)
		if err != nil || result != nil {
			return handleRequeuePostgres(result, err, user.SetCondition)
		}
		return ctrl.Result{}, nil
	}

	credentials := new(v1alpha1.PostgresCredentials)
	if err := r.Get(ctx, types.NamespacedName{Name: user.Spec.CredentialsRef.Name, Namespace: user.Namespace}, credentials); err != nil {
		logger.V(5).Info(err.Error())
		return handleRequeue(nil, err, user.SetCondition)
	}

	if err := r.addOrRemoveFinalizer(ctx, user, credentials); err != nil {
		utils.MarkCondition(user.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	if !meta.IsStatusConditionTrue(credentials.Status.Conditions, v1alpha1.ReadyConditionType.String()) {
		err := fmt.Errorf("unauthorized or unhealthy Postgres")
		logger.V(5).Info(err.Error())
		utils.MarkCondition(user.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return jitterRequeue(requeueWaitForResources), nil
	}

	if err = r.PostgresClient.Init(ctx, r.Client, credentials); err != nil {
		logger.Error(err, "failed to create Postgres client")
		utils.MarkCondition(user.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	secret, err := utils.GetSecret(ctx, r.Client, &corev1.SecretReference{Name: user.Spec.PasswordSecretKeyRef.Name, Namespace: user.Namespace})
	if err != nil {
		logger.V(5).Error(err, "failed to get password")
		return handleRequeue(nil, err, user.SetCondition)
	}

	if err := utils.TryAddControllerRef(ctx, r.Client, user, secret, r.Scheme); err != nil {
		logger.V(5).Error(err, "failed to add controller ref")
		return ctrl.Result{}, err
	}
	if err := utils.TryAddFinalizer(ctx, r.Client, secret, PostgresSecretProtectionFinalizerName); err != nil {
		logger.V(5).Error(err, "failed to add finalizer")
		return ctrl.Result{}, err
	}

	key, exists := secret.Data[user.Spec.PasswordSecretKeyRef.Key]
	if !exists {
		return ctrl.Result{}, fmt.Errorf("secret %s does not contain key %s", user.Spec.PasswordSecretKeyRef.Name, user.Spec.PasswordSecretKeyRef.Key)
	}
	password := strings.ReplaceAll(string(key), "\n", "")

	if err := r.PostgresClient.UpsertUser(user.UserName(), password); err != nil {
		logger.V(5).Error(err, "failed to create role")
		utils.MarkCondition(user.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	for _, db := range user.Spec.Databases {
		exists, err = r.PostgresClient.DatabaseExists(db)
		if err != nil {
			logger.V(5).Error(err, "failed to check database existence")
			utils.MarkCondition(user.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		if !exists {
			continue
		}
		if err := r.PostgresClient.SetDatabaseOwner(db, user.UserName()); err != nil {
			logger.V(5).Error(err, "failed to create role")
			utils.MarkCondition(user.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		dbList := &v1alpha1.PostgresDatabaseList{}
		if err := r.List(ctx, dbList, client.InNamespace(credentials.Namespace)); err != nil {
			return ctrl.Result{}, err
		}
		for _, crdDB := range dbList.Items {
			if crdDB.DatabaseName() == db {
				if err := utils.TryAddControllerRef(ctx, r.Client, user, &crdDB, r.Scheme); err != nil {
					logger.V(5).Error(err, "failed to add controller ref")
					return ctrl.Result{}, err
				}
			}
		}
	}

	utils.MarkCondition(user.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(user.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return jitterRequeue(requeueDefault), nil
}

func (r *PostgresUserReconciler) handleDelete(ctx context.Context, user *v1alpha1.PostgresUser) (*ctrl.Result, error) {
	credentials := new(v1alpha1.PostgresCredentials)
	err := r.Get(ctx, types.NamespacedName{Name: user.Spec.CredentialsRef.Name, Namespace: user.Namespace}, credentials)

	if err != nil || !meta.IsStatusConditionTrue(credentials.Status.Conditions, v1alpha1.ReadyConditionType.String()) {
		if err := deleteRefSecret(ctx, r.Client, user.Namespace, user.Spec.PasswordSecretKeyRef.Name, PostgresSecretProtectionFinalizerName); err != nil {
			return nil, err
		}
		controllerutil.RemoveFinalizer(user, PostgresUserProtectionFinalizerName)
		return nil, nil
	}

	if len(user.Spec.Databases) > 0 {
		databaseList := containers.ToSet[string](user.Spec.Databases)

		dbList := &v1alpha1.PostgresDatabaseList{}
		if err := r.List(ctx, dbList, client.InNamespace(user.Namespace)); err != nil {
			return nil, err
		}
		var deletingAny bool
		for _, db := range dbList.Items {
			if databaseList.Has(db.DatabaseName()) {
				deletingAny = true
				if db.DeletionTimestamp.IsZero() {
					if err := r.Delete(ctx, &db); err != nil {
						return nil, err
					}
				}
			}
		}
		if deletingAny {
			return &ctrl.Result{RequeueAfter: requeueWaitForResources}, nil
		}
	}

	if err := r.PostgresClient.Init(ctx, r.Client, credentials); err != nil {
		return nil, err
	}

	if err := r.PostgresClient.DeleteUser(user.UserName()); err != nil {
		return nil, err
	}

	if err := deleteRefSecret(ctx, r.Client, user.Namespace, user.Spec.PasswordSecretKeyRef.Name, PostgresSecretProtectionFinalizerName); err != nil {
		return nil, err
	}
	controllerutil.RemoveFinalizer(user, PostgresUserProtectionFinalizerName)
	return nil, nil
}

func (r *PostgresUserReconciler) addOrRemoveFinalizer(ctx context.Context, user *v1alpha1.PostgresUser, credentials *v1alpha1.PostgresCredentials) error {
	if user.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(user, PostgresUserProtectionFinalizerName) {
		controllerutil.AddFinalizer(user, PostgresUserProtectionFinalizerName)
		if err := utils.TryAddFinalizer(ctx, r.Client, credentials, PostgresUserProtectionFinalizerName); err != nil {
			return err
		}
	}
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *PostgresUserReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.PostgresUser{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Owns(&corev1.Secret{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})).
		Owns(&v1alpha1.PostgresDatabase{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})).
		Complete(r)
}
