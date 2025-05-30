package controller

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"

	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	"github.com/elastic/go-elasticsearch/v9"
	"github.com/pluralsh/console/go/datastore/internal/utils"
	"k8s.io/apimachinery/pkg/api/meta"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"

	"github.com/pluralsh/console/go/datastore/api/v1alpha1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// ElasticSearchIndexTemplateReconciler reconciles a ElasticsearchIndexTemplate object
type ElasticSearchIndexTemplateReconciler struct {
	client.Client
	Scheme *runtime.Scheme
}

//+kubebuilder:rbac:groups=dbs.plural.sh,resources=elasticsearchindextemplates,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=dbs.plural.sh,resources=elasticsearchindextemplates/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=dbs.plural.sh,resources=elasticsearchindextemplates/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *ElasticSearchIndexTemplateReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, retErr error) {
	logger := ctrl.LoggerFrom(ctx)

	index := new(v1alpha1.ElasticsearchIndexTemplate)
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
		utils.MarkCondition(index.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	if err := createTemplateIndex(ctx, es, index.Spec); err != nil {
		logger.Error(err, "failed to create template index")
		return ctrl.Result{}, err
	}
	utils.MarkCondition(index.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(index.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return ctrl.Result{}, nil
}

func createTemplateIndex(ctx context.Context, es *elasticsearch.Client, index v1alpha1.ElasticsearchIndexTemplateSpec) error {
	indexTemplate := map[string]interface{}{
		"index_patterns": index.Definition.IndexPatterns,
		"template":       index.Definition.Template,
	}

	body, err := json.Marshal(indexTemplate)
	if err != nil {
		return err
	}
	res, err := es.Indices.PutIndexTemplate(index.Name, bytes.NewReader(body))
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
		return fmt.Errorf("failed to create index template: %s", res.String())
	}

	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *ElasticSearchIndexTemplateReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.ElasticsearchIndexTemplate{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}
