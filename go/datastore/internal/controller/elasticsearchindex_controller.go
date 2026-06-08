package controller

import (
	"context"
	"fmt"
	"io"
	"net/http"

	e "github.com/pluralsh/console/go/datastore/internal/client/elasticsearch"
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
	ElasticsearchIndexProtectionFinalizerName = "projects.deployments.plural.sh/elastic-search-index-protection"
)

// ElasticSearchIndexReconciler reconciles a ElasticsearchIndex object
type ElasticSearchIndexReconciler struct {
	client.Client
	Scheme              *runtime.Scheme
	ElasticsearchClient e.ElasticsearchClient
}

// +kubebuilder:rbac:groups=dbs.plural.sh,resources=elasticsearchindices,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=dbs.plural.sh,resources=elasticsearchindices/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=dbs.plural.sh,resources=elasticsearchindices/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *ElasticSearchIndexReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, retErr error) {
	logger := ctrl.LoggerFrom(ctx)

	index := new(v1alpha1.ElasticsearchIndex)
	if err := r.Get(ctx, req.NamespacedName, index); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	utils.MarkCondition(index.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	scope, err := NewDefaultScope(ctx, r.Client, index)
	if err != nil {
		logger.V(5).Info(err.Error())
		utils.MarkCondition(index.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && retErr == nil {
			retErr = err
		}
	}()

	credentials := new(v1alpha1.ElasticsearchCredentials)
	if err := r.Get(ctx, types.NamespacedName{Name: index.Spec.CredentialsRef.Name, Namespace: index.Namespace}, credentials); err != nil {
		logger.V(5).Info(err.Error())
		return handleRequeue(nil, err, index.SetCondition)
	}

	if !meta.IsStatusConditionTrue(credentials.Status.Conditions, v1alpha1.ReadyConditionType.String()) {
		err := fmt.Errorf("unauthorized or unhealthy Elasticsearch")
		logger.V(5).Info(err.Error())
		utils.MarkCondition(index.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return jitterRequeue(requeueDefault), nil
	}

	if err = r.ElasticsearchClient.Init(ctx, r.Client, credentials); err != nil {
		logger.Error(err, "failed to create Elasticsearch client")
		utils.MarkCondition(index.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	if err := r.addOrRemoveFinalizer(ctx, index, credentials); err != nil {
		utils.MarkCondition(index.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	if !index.DeletionTimestamp.IsZero() {
		if err = r.handleDelete(ctx, index); err != nil {
			utils.MarkCondition(index.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		return ctrl.Result{}, nil
	}

	if err = r.sync(ctx, index); err != nil {
		logger.Error(err, "failed to sync Elasticsearch index", "index", index.Name, "namespace", index.Namespace)
		utils.MarkCondition(index.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	utils.MarkCondition(index.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(index.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return ctrl.Result{}, nil
}

func (r *ElasticSearchIndexReconciler) sync(ctx context.Context, index *v1alpha1.ElasticsearchIndex) error {
	exists, err := r.indexExists(ctx, index.ResourceName())
	if err != nil {
		return err
	}
	if exists {
		return nil
	}

	res, err := r.ElasticsearchClient.CreateIndex(index.ResourceName(), index.Spec.Definition)
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
		return fmt.Errorf("failed to create Elasticsearch index: %s", res.String())
	}

	return nil
}

func (r *ElasticSearchIndexReconciler) indexExists(ctx context.Context, indexName string) (bool, error) {
	res, err := r.ElasticsearchClient.ExistsIndex(ctx, indexName)
	if err != nil {
		return false, err
	}
	defer func(Body io.ReadCloser) {
		err := Body.Close()
		if err != nil {
			ctrl.LoggerFrom(ctx).Error(err, "failed to close body")
		}
	}(res.Body)

	if res.StatusCode == http.StatusNotFound {
		return false, nil
	}
	if res.IsError() {
		return false, fmt.Errorf("failed to check Elasticsearch index existence: %s", res.String())
	}

	return true, nil
}

func (r *ElasticSearchIndexReconciler) addOrRemoveFinalizer(ctx context.Context, index *v1alpha1.ElasticsearchIndex, credentials *v1alpha1.ElasticsearchCredentials) error {
	if index.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(index, ElasticsearchIndexProtectionFinalizerName) {
		controllerutil.AddFinalizer(index, ElasticsearchIndexProtectionFinalizerName)
		if err := utils.TryAddFinalizer(ctx, r.Client, credentials, ElasticsearchIndexProtectionFinalizerName); err != nil {
			return err
		}
	}
	return nil
}

func (r *ElasticSearchIndexReconciler) handleDelete(ctx context.Context, index *v1alpha1.ElasticsearchIndex) error {
	res, err := r.ElasticsearchClient.DeleteIndex(ctx, index.ResourceName())
	if err != nil {
		return fmt.Errorf("delete index request failed: %w", err)
	}
	defer func(Body io.ReadCloser) {
		err := Body.Close()
		if err != nil {
			ctrl.LoggerFrom(ctx).Error(err, "failed to close body")
		}
	}(res.Body)

	if res.StatusCode != http.StatusNotFound && res.IsError() {
		return fmt.Errorf("failed to delete Elasticsearch index: %s", res.String())
	}

	controllerutil.RemoveFinalizer(index, ElasticsearchIndexProtectionFinalizerName)
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *ElasticSearchIndexReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.ElasticsearchIndex{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}
