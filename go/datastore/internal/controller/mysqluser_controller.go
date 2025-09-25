package controller

import (
	"context"
	"fmt"
	"strings"

	"github.com/pluralsh/console/go/datastore/internal/client/mysql"
	"github.com/pluralsh/console/go/datastore/internal/utils"
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
	MySqlUserProtectionFinalizerName = "projects.deployments.plural.sh/mysql-user-protection"
)

// MySqlUserReconciler reconciles a MySqlUser object
type MySqlUserReconciler struct {
	client.Client
	Scheme      *runtime.Scheme
	MySqlClient mysql.MySqlClient
}

//+kubebuilder:rbac:groups=dbs.plural.sh,resources=mysqlusers,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=dbs.plural.sh,resources=mysqlusers/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=dbs.plural.sh,resources=mysqlusers/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *MySqlUserReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, retErr error) {
	logger := ctrl.LoggerFrom(ctx)

	user := new(v1alpha1.MySqlUser)
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
		if err := scope.PatchObject(); err != nil && retErr == nil {
			retErr = err
		}
	}()

	if !user.DeletionTimestamp.IsZero() {
		if err = r.handleDelete(ctx, user); err != nil {
			return ctrl.Result{}, err
		}
		return ctrl.Result{}, nil
	}

	credentials := new(v1alpha1.MySqlCredentials)
	if err := r.Get(ctx, types.NamespacedName{Name: user.Spec.CredentialsRef.Name, Namespace: user.Namespace}, credentials); err != nil {
		logger.V(5).Info(err.Error())
		return handleRequeue(nil, err, user.SetCondition)
	}

	if err := r.addOrRemoveFinalizer(ctx, user, credentials); err != nil {
		utils.MarkCondition(user.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	if !meta.IsStatusConditionTrue(credentials.Status.Conditions, v1alpha1.ReadyConditionType.String()) {
		err := fmt.Errorf("unauthorized or unhealthy MySql")
		logger.V(5).Info(err.Error())
		utils.MarkCondition(user.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return jitterRequeue(requeueWaitForResources), nil
	}

	if err = r.MySqlClient.Init(ctx, r.Client, credentials); err != nil {
		logger.Error(err, "failed to create MySql client")
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
	if err := utils.TryAddFinalizer(ctx, r.Client, secret, MySqlSecretProtectionFinalizerName); err != nil {
		logger.V(5).Error(err, "failed to add finalizer")
		return ctrl.Result{}, err
	}

	key, exists := secret.Data[user.Spec.PasswordSecretKeyRef.Key]
	if !exists {
		return ctrl.Result{}, fmt.Errorf("secret %s does not contain key %s", user.Spec.PasswordSecretKeyRef.Name, user.Spec.PasswordSecretKeyRef.Key)
	}
	password := strings.ReplaceAll(string(key), "\n", "")

	if err := r.MySqlClient.UpsertUser(user.UserName(), password); err != nil {
		logger.V(5).Error(err, "failed to create user")
		utils.MarkCondition(user.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	for _, db := range user.Spec.Databases {
		exists, err = r.MySqlClient.DatabaseExists(db)
		if err != nil {
			logger.V(5).Error(err, "failed to check database existence")
			utils.MarkCondition(user.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		if !exists {
			continue
		}
		if err := r.MySqlClient.SetDatabaseOwner(db, user.UserName()); err != nil {
			logger.V(5).Error(err, "failed to set database owner")
			utils.MarkCondition(user.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		dbList := &v1alpha1.MySqlDatabaseList{}
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

func (r *MySqlUserReconciler) handleDelete(ctx context.Context, user *v1alpha1.MySqlUser) error {
	credentials := new(v1alpha1.MySqlCredentials)
	err := r.Get(ctx, types.NamespacedName{Name: user.Spec.CredentialsRef.Name, Namespace: user.Namespace}, credentials)

	if err != nil || !meta.IsStatusConditionTrue(credentials.Status.Conditions, v1alpha1.ReadyConditionType.String()) {
		if err := deleteRefSecret(ctx, r.Client, user.Namespace, user.Spec.PasswordSecretKeyRef.Name, MySqlSecretProtectionFinalizerName); err != nil {
			return err
		}
		controllerutil.RemoveFinalizer(user, MySqlUserProtectionFinalizerName)
		return nil
	}

	if err := r.MySqlClient.Init(ctx, r.Client, credentials); err != nil {
		return err
	}

	if err := r.MySqlClient.DeleteUser(user.UserName()); err != nil {
		return err
	}

	if err := deleteRefSecret(ctx, r.Client, user.Namespace, user.Spec.PasswordSecretKeyRef.Name, MySqlSecretProtectionFinalizerName); err != nil {
		return err
	}
	controllerutil.RemoveFinalizer(user, MySqlUserProtectionFinalizerName)
	return nil
}

func (r *MySqlUserReconciler) addOrRemoveFinalizer(ctx context.Context, user *v1alpha1.MySqlUser, credentials *v1alpha1.MySqlCredentials) error {
	if user.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(user, MySqlUserProtectionFinalizerName) {
		controllerutil.AddFinalizer(user, MySqlUserProtectionFinalizerName)
		if err := utils.TryAddFinalizer(ctx, r.Client, credentials, MySqlUserProtectionFinalizerName); err != nil {
			return err
		}
	}
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *MySqlUserReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.MySqlUser{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Owns(&corev1.Secret{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})).
		Owns(&v1alpha1.MySqlDatabase{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})).
		Complete(r)
}
