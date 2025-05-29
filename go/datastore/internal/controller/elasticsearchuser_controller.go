package controller

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/elastic/go-elasticsearch/v8"
	"github.com/elastic/go-elasticsearch/v8/esapi"
	"github.com/pluralsh/console/go/datastore/internal/utils"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	"github.com/pluralsh/console/go/datastore/api/v1alpha1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
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

	credentials := new(v1alpha1.ElasticSearchCredentials)
	if err := r.Get(ctx, types.NamespacedName{Name: user.Spec.CredentialsRef.Name, Namespace: user.Namespace}, credentials); err != nil {
		logger.V(5).Info(err.Error())
		if apierrors.IsNotFound(err) {
			return handleRequeue(nil, err, credentials.SetCondition)
		}
		return ctrl.Result{}, err
	}

	if !meta.IsStatusConditionTrue(credentials.Status.Conditions, v1alpha1.ReadyConditionType.String()) {
		err := fmt.Errorf("unauthorized or unhealthy Elasticsearch")
		logger.V(5).Info(err.Error())
		return handleRequeue(nil, err, credentials.SetCondition)
	}
	es, err := createElasticSearchClient(ctx, r.Client, *credentials)
	if err != nil {
		logger.Error(err, "failed to create Elasticsearch client")
		utils.MarkCondition(user.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	roles, err := listAllRoles(es)
	if err != nil {
		logger.Error(err, "failed to list roles for Elasticsearch")
		return ctrl.Result{}, err
	}
	fmt.Println(roles)

	return ctrl.Result{}, nil
}

func listAllRoles(es *elasticsearch.Client) (map[string]interface{}, error) {
	req := esapi.SecurityGetRoleRequest{} // No name = fetch all
	res, err := req.Do(context.Background(), es)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer res.Body.Close()

	if res.IsError() {
		return nil, fmt.Errorf("error fetching roles: %s", res.String())
	}

	var result map[string]interface{}
	if err := json.NewDecoder(res.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("error decoding response: %w", err)
	}

	return result, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *ElasticSearchUserReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.ElasticSearchUser{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}
