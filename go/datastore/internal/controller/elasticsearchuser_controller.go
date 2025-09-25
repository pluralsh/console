package controller

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"k8s.io/apimachinery/pkg/api/meta"

	"github.com/pluralsh/console/go/datastore/api/v1alpha1"
	e "github.com/pluralsh/console/go/datastore/internal/client/elasticsearch"
	"github.com/pluralsh/console/go/datastore/internal/utils"
	corev1 "k8s.io/api/core/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

const (
	ElasticSearchUserProtectionFinalizerName = "projects.deployments.plural.sh/elastic-search-user-protection"
)

// ElasticSearchUserReconciler reconciles a ElasticsearchUser object
type ElasticSearchUserReconciler struct {
	client.Client
	Scheme              *runtime.Scheme
	ElasticsearchClient e.ElasticsearchClient
}

//+kubebuilder:rbac:groups=dbs.plural.sh,resources=elasticsearchusers,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=dbs.plural.sh,resources=elasticsearchusers/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=dbs.plural.sh,resources=elasticsearchusers/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *ElasticSearchUserReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, retErr error) {
	logger := ctrl.LoggerFrom(ctx)

	user := new(v1alpha1.ElasticsearchUser)
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

	credentials := new(v1alpha1.ElasticsearchCredentials)
	if err := r.Get(ctx, types.NamespacedName{Name: user.Spec.CredentialsRef.Name, Namespace: user.Namespace}, credentials); err != nil {
		logger.V(5).Info(err.Error())
		return handleRequeue(nil, err, user.SetCondition)
	}

	if !meta.IsStatusConditionTrue(credentials.Status.Conditions, v1alpha1.ReadyConditionType.String()) {
		err := fmt.Errorf("unauthorized or unhealthy Elasticsearch")
		logger.V(5).Info(err.Error())
		utils.MarkCondition(user.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return jitterRequeue(requeueDefault), nil
	}

	if err = r.ElasticsearchClient.Init(ctx, r.Client, credentials); err != nil {
		logger.Error(err, "failed to create Elasticsearch client")
		utils.MarkCondition(user.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	if err := r.addOrRemoveFinalizer(ctx, user, credentials); err != nil {
		utils.MarkCondition(user.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if !user.DeletionTimestamp.IsZero() {
		err = r.handleDelete(ctx, user)
		if err != nil {
			utils.MarkCondition(user.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		return ctrl.Result{}, nil
	}

	secret, err := utils.GetSecret(ctx, r.Client, &corev1.SecretReference{Name: user.Spec.Definition.PasswordSecretKeyRef.Name, Namespace: user.Namespace})
	if err != nil {
		logger.V(5).Error(err, "failed to get password")
		return handleRequeue(nil, err, user.SetCondition)
	}

	if err := utils.TryAddControllerRef(ctx, r.Client, user, secret, r.Scheme); err != nil {
		logger.V(5).Error(err, "failed to add controller ref")
		return ctrl.Result{}, err
	}
	if err := utils.TryAddFinalizer(ctx, r.Client, secret, ElasticSearchSecretProtectionFinalizerName); err != nil {
		logger.V(5).Error(err, "failed to add finalizer")
		return ctrl.Result{}, err
	}

	key, exists := secret.Data[user.Spec.Definition.PasswordSecretKeyRef.Key]
	if !exists {
		return ctrl.Result{}, fmt.Errorf("secret %s does not contain key %s", user.Spec.Definition.PasswordSecretKeyRef.Name, user.Spec.Definition.PasswordSecretKeyRef.Key)
	}
	password := strings.ReplaceAll(string(key), "\n", "")

	if err := r.createRole(ctx, user.Spec.Definition.Role); err != nil {
		logger.V(5).Error(err, "failed to create role")
		utils.MarkCondition(user.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	if err := r.createUser(ctx, user.Spec.Definition.User, password, user.Spec.Definition.Role.Name); err != nil {
		logger.V(5).Error(err, "failed to create user")
		utils.MarkCondition(user.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	utils.MarkCondition(user.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(user.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return ctrl.Result{}, nil
}

func (r *ElasticSearchUserReconciler) createUser(ctx context.Context, user, password, role string) error {
	userDef := map[string]interface{}{
		"password":  password,
		"roles":     []string{role}, // Adjust as needed
		"full_name": fmt.Sprintf("User %s", user),
	}
	body, err := json.Marshal(userDef)
	if err != nil {
		return err
	}
	res, err := r.ElasticsearchClient.CreateUser(user, body)
	if err != nil {
		return err
	}
	defer func(Body io.ReadCloser) {
		err := Body.Close()
		if err != nil {
			ctrl.LoggerFrom(ctx).Error(err, "failed to close body")
		}
	}(res.Body)
	if res.IsError() {
		return fmt.Errorf("failed to create user: %s", res.String())
	}

	return nil
}

func (r *ElasticSearchUserReconciler) createRole(ctx context.Context, role v1alpha1.ElasticsearchRole) error {
	roleBody := map[string]interface{}{
		"cluster": role.ClusterPermissions,
		"indices": []map[string]interface{}{},
	}

	for _, indexPerm := range role.IndexPermissions {
		roleBody["indices"] = append(roleBody["indices"].([]map[string]interface{}), map[string]interface{}{
			"names":      indexPerm.Names,
			"privileges": indexPerm.Privileges,
		})
	}

	body, err := json.Marshal(roleBody)
	if err != nil {
		return err
	}
	res, err := r.ElasticsearchClient.CreateRole(role.Name, body)
	if err != nil {
		return err
	}
	defer func(Body io.ReadCloser) {
		err := Body.Close()
		if err != nil {
			ctrl.LoggerFrom(ctx).Error(err, "failed to close body")
		}
	}(res.Body)
	if res.IsError() {
		return fmt.Errorf("failed to create role: %s", res.String())
	}

	return nil
}

func (r *ElasticSearchUserReconciler) deleteRole(ctx context.Context, roleName string) error {
	res, err := r.ElasticsearchClient.DeleteUserRole(ctx, roleName)
	if err != nil {
		return fmt.Errorf("delete role request failed: %w", err)
	}
	defer func(Body io.ReadCloser) {
		err := Body.Close()
		if err != nil {
			ctrl.LoggerFrom(ctx).Error(err, "failed to close body")
		}
	}(res.Body)

	if res.StatusCode == http.StatusNotFound {
		return nil
	}

	if res.IsError() {
		return fmt.Errorf("error deleting role: %s", res.String())
	}

	return nil
}

func (r *ElasticSearchUserReconciler) deleteUser(ctx context.Context, username string) error {
	res, err := r.ElasticsearchClient.DeleteUser(ctx, username)
	if err != nil {
		return fmt.Errorf("delete user request failed: %w", err)
	}
	defer func(Body io.ReadCloser) {
		err := Body.Close()
		if err != nil {
			ctrl.LoggerFrom(ctx).Error(err, "failed to close body")
		}
	}(res.Body)

	if res.StatusCode == http.StatusNotFound {
		return nil
	}

	if res.IsError() {
		return fmt.Errorf("error deleting user: %s", res.String())
	}

	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *ElasticSearchUserReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.ElasticsearchUser{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Owns(&corev1.Secret{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})).
		Complete(r)
}

func (r *ElasticSearchUserReconciler) addOrRemoveFinalizer(ctx context.Context, user *v1alpha1.ElasticsearchUser, credentials *v1alpha1.ElasticsearchCredentials) error {
	if user.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(user, ElasticSearchUserProtectionFinalizerName) {
		controllerutil.AddFinalizer(user, ElasticSearchUserProtectionFinalizerName)
		if err := utils.TryAddFinalizer(ctx, r.Client, credentials, ElasticSearchUserProtectionFinalizerName); err != nil {
			return err
		}
	}

	return nil
}

func (r *ElasticSearchUserReconciler) handleDelete(ctx context.Context, user *v1alpha1.ElasticsearchUser) error {
	if err := r.deleteRole(ctx, user.Spec.Definition.Role.Name); err != nil {
		ctrl.LoggerFrom(ctx).Error(err, "failed to delete role")
		return err
	}

	if err := r.deleteUser(ctx, user.Spec.Definition.User); err != nil {
		ctrl.LoggerFrom(ctx).Error(err, "failed to delete user")
		return err
	}
	if err := deleteRefSecret(ctx, r.Client, user.Namespace, user.Spec.Definition.PasswordSecretKeyRef.Name, ElasticSearchSecretProtectionFinalizerName); err != nil {
		return err
	}
	controllerutil.RemoveFinalizer(user, ElasticSearchUserProtectionFinalizerName)
	return nil
}
