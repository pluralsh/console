package controller

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/elastic/go-elasticsearch/v9"
	"github.com/elastic/go-elasticsearch/v9/esapi"
	"github.com/pluralsh/console/go/datastore/api/v1alpha1"
	"github.com/pluralsh/console/go/datastore/internal/utils"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
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

// ElasticSearchUserReconciler reconciles a ElasticSearchUser object
type ElasticSearchUserReconciler struct {
	client.Client
	Scheme *runtime.Scheme
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

	user := new(v1alpha1.ElasticSearchUser)
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

	secret, err := utils.GetSecret(ctx, r.Client, &corev1.SecretReference{Name: user.Spec.Definition.PasswordSecretKeyRef.Name, Namespace: user.Namespace})
	if err != nil {
		logger.V(5).Error(err, "failed to get password")
		return handleRequeue(nil, err, user.SetCondition)
	}
	key, exists := secret.Data[user.Spec.Definition.PasswordSecretKeyRef.Key]
	if !exists {
		return ctrl.Result{}, fmt.Errorf("secret %s does not contain key %s", user.Spec.Definition.PasswordSecretKeyRef.Name, user.Spec.Definition.PasswordSecretKeyRef.Key)
	}
	password := strings.ReplaceAll(string(key), "\n", "")

	credentials := new(v1alpha1.ElasticSearchCredentials)
	if err := r.Get(ctx, types.NamespacedName{Name: user.Spec.CredentialsRef.Name, Namespace: user.Namespace}, credentials); err != nil {
		logger.V(5).Info(err.Error())
		return handleRequeue(nil, err, credentials.SetCondition)
	}

	if !meta.IsStatusConditionTrue(credentials.Status.Conditions, v1alpha1.ReadyConditionType.String()) {
		err := fmt.Errorf("unauthorized or unhealthy Elasticsearch")
		logger.V(5).Info(err.Error())
		return handleRequeue(nil, err, credentials.SetCondition)
	}
	es, err := createElasticsearchClient(ctx, r.Client, *credentials)
	if err != nil {
		logger.Error(err, "failed to create Elasticsearch client")
		utils.MarkCondition(user.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	result := r.addOrRemoveFinalizer(ctx, es, user)
	if result != nil {
		return *result, retErr
	}

	if err := createRole(ctx, es, user.Spec.Definition.Role); err != nil {
		logger.Error(err, "failed to create role")
		return ctrl.Result{}, err
	}

	if err := createUser(ctx, es, user.Spec.Definition.User, password, user.Spec.Definition.Role.Name); err != nil {
		logger.Error(err, "failed to create user")
		return ctrl.Result{}, err
	}

	utils.MarkCondition(user.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(user.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return ctrl.Result{}, nil
}

func createUser(ctx context.Context, es *elasticsearch.Client, user, password, role string) error {
	userDef := map[string]interface{}{
		"password":  password,
		"roles":     []string{role}, // Adjust as needed
		"full_name": fmt.Sprintf("User %s", user),
	}
	body, err := json.Marshal(userDef)
	if err != nil {
		return err
	}
	res, err := es.Security.PutUser(user, bytes.NewReader(body))
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

func createRole(ctx context.Context, es *elasticsearch.Client, role v1alpha1.ElasticSearchRole) error {
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
	res, err := es.Security.PutRole(role.Name, bytes.NewReader(body))
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

func deleteRole(ctx context.Context, es *elasticsearch.Client, roleName string) error {
	req := esapi.SecurityDeleteRoleRequest{
		Name: roleName,
	}

	res, err := req.Do(context.Background(), es)
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

func deleteUser(ctx context.Context, es *elasticsearch.Client, username string) error {
	req := esapi.SecurityDeleteUserRequest{
		Username: username,
	}

	res, err := req.Do(context.Background(), es)
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
		For(&v1alpha1.ElasticSearchUser{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}

func (r *ElasticSearchUserReconciler) addOrRemoveFinalizer(ctx context.Context, es *elasticsearch.Client, user *v1alpha1.ElasticSearchUser) *ctrl.Result {
	if user.ObjectMeta.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(user, ElasticSearchUserProtectionFinalizerName) {
		controllerutil.AddFinalizer(user, ElasticSearchUserProtectionFinalizerName)
	}

	// If object is not being deleted, do nothing
	if user.GetDeletionTimestamp().IsZero() {
		return nil
	}

	if err := deleteRole(ctx, es, user.Spec.Definition.Role.Name); err != nil {
		ctrl.LoggerFrom(ctx).Error(err, "failed to delete role")
		utils.MarkCondition(user.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return &requeue
	}

	if err := deleteUser(ctx, es, user.Spec.Definition.User); err != nil {
		ctrl.LoggerFrom(ctx).Error(err, "failed to delete user")
		utils.MarkCondition(user.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return &requeue
	}

	controllerutil.RemoveFinalizer(user, ElasticSearchUserProtectionFinalizerName)
	return &ctrl.Result{}
}
