package controller

import (
	"context"
	"strings"

	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"

	"github.com/pluralsh/console/go/datastore/api/v1alpha1"
	"github.com/pluralsh/console/go/datastore/internal/client/mysql"
	"github.com/pluralsh/console/go/datastore/internal/utils"
	corev1 "k8s.io/api/core/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

const (
	MySqlCredentialsProtectionFinalizerName = "projects.deployments.plural.sh/mysql-credentials-protection"
)

// MySqlCredentialsReconciler reconciles a MySqlCredentials object
type MySqlCredentialsReconciler struct {
	client.Client
	Scheme      *runtime.Scheme
	MySqlClient mysql.MySqlClient
}

//+kubebuilder:rbac:groups=dbs.plural.sh,resources=mysqlcredentials,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=dbs.plural.sh,resources=mysqlcredentials/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=dbs.plural.sh,resources=mysqlcredentials/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *MySqlCredentialsReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, retErr error) {
	logger := ctrl.LoggerFrom(ctx)

	credentials := new(v1alpha1.MySqlCredentials)
	if err := r.Get(ctx, req.NamespacedName, credentials); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	utils.MarkCondition(credentials.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	scope, err := NewDefaultScope(ctx, r.Client, credentials)
	if err != nil {
		utils.MarkCondition(credentials.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && retErr == nil {
			retErr = err
		}
	}()

	if !credentials.DeletionTimestamp.IsZero() {
		return r.handleDelete(ctx, credentials)
	}
	secret, err := utils.GetSecret(ctx, r.Client, &corev1.SecretReference{Name: credentials.Spec.PasswordSecretKeyRef.Name, Namespace: credentials.Namespace})
	if err != nil {
		logger.V(7).Error(err, "failed to get password")
		return handleRequeue(nil, err, credentials.SetCondition)
	}
	if err := utils.TryAddFinalizer(ctx, r.Client, secret, MySqlSecretProtectionFinalizerName); err != nil {
		logger.V(5).Error(err, "failed to add finalizer")
		return ctrl.Result{}, err
	}
	utils.AddFinalizer(credentials, MySqlCredentialsProtectionFinalizerName)

	err = r.MySqlClient.Init(ctx, r.Client, credentials)
	if err != nil {
		logger.Error(err, "failed to create MySQL client")
		utils.MarkCondition(credentials.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	if err := r.MySqlClient.Ping(); err != nil {
		logger.V(5).Error(err, "failed to connect to MySQL")
		return handleRequeue(&requeue, err, credentials.SetCondition)
	}

	logger.Info("Successfully connected to MySQL")

	utils.MarkCondition(credentials.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(credentials.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return requeue, nil
}

func (r *MySqlCredentialsReconciler) handleDelete(ctx context.Context, credentials *v1alpha1.MySqlCredentials) (ctrl.Result, error) {
	if controllerutil.ContainsFinalizer(credentials, MySqlDatabaseProtectionFinalizerName) {
		dbList := &v1alpha1.MySqlDatabaseList{}
		if err := r.List(ctx, dbList, client.InNamespace(credentials.Namespace)); err != nil {
			return ctrl.Result{}, err
		}
		var deletingAny bool
		for _, db := range dbList.Items {
			if strings.EqualFold(db.Spec.CredentialsRef.Name, credentials.Name) {
				deletingAny = true
				if db.DeletionTimestamp.IsZero() {
					if err := r.Delete(ctx, &db); err != nil {
						return ctrl.Result{}, err
					}
				}
			}
		}
		if deletingAny {
			return waitForResources, nil
		}
		utils.RemoveFinalizer(credentials, MySqlDatabaseProtectionFinalizerName)
	}

	if controllerutil.ContainsFinalizer(credentials, MySqlUserProtectionFinalizerName) {
		userList := &v1alpha1.MySqlUserList{}
		if err := r.List(ctx, userList, client.InNamespace(credentials.Namespace)); err != nil {
			return ctrl.Result{}, err
		}
		var deletingAny bool
		for _, usr := range userList.Items {
			if strings.EqualFold(usr.Spec.CredentialsRef.Name, credentials.Name) {
				deletingAny = true
				if usr.DeletionTimestamp.IsZero() {
					if err := r.Delete(ctx, &usr); err != nil {
						return ctrl.Result{}, err
					}
				}
			}
		}
		if deletingAny {
			return waitForResources, nil
		}
		utils.RemoveFinalizer(credentials, MySqlUserProtectionFinalizerName)
	}

	if err := deleteRefSecret(ctx, r.Client, credentials.Namespace, credentials.Spec.PasswordSecretKeyRef.Name, MySqlSecretProtectionFinalizerName); err != nil {
		return ctrl.Result{}, err
	}
	utils.RemoveFinalizer(credentials, MySqlCredentialsProtectionFinalizerName)
	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *MySqlCredentialsReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.MySqlCredentials{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Owns(&corev1.Secret{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}
