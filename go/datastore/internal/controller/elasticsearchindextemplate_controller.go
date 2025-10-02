package controller

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	e "github.com/pluralsh/console/go/datastore/internal/client/elasticsearch"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"

	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	"github.com/pluralsh/console/go/datastore/internal/utils"
	"k8s.io/apimachinery/pkg/api/meta"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"

	"github.com/pluralsh/console/go/datastore/api/v1alpha1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	ElasticsearchIndexTemplateProtectionFinalizerName = "projects.deployments.plural.sh/elastic-search-template-protection"
)

// ElasticSearchIndexTemplateReconciler reconciles a ElasticsearchIndexTemplate object
type ElasticSearchIndexTemplateReconciler struct {
	client.Client
	Scheme              *runtime.Scheme
	ElasticsearchClient e.ElasticsearchClient
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
		err = r.handleDelete(ctx, index)
		if err != nil {
			utils.MarkCondition(index.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		return ctrl.Result{}, nil
	}

	if err := r.createTemplateIndex(ctx, *index); err != nil {
		logger.Error(err, "failed to create template index")
		utils.MarkCondition(index.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	utils.MarkCondition(index.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(index.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return ctrl.Result{}, nil
}

func (r *ElasticSearchIndexTemplateReconciler) createTemplateIndex(ctx context.Context, index v1alpha1.ElasticsearchIndexTemplate) error {
	priority := 0
	if index.Spec.Definition.Priority != nil {
		priority = *index.Spec.Definition.Priority
	}
	indexTemplate := map[string]interface{}{
		"index_patterns": index.Spec.Definition.IndexPatterns,
		"template":       index.Spec.Definition.Template,
		"priority":       priority,
	}

	body, err := json.Marshal(indexTemplate)
	if err != nil {
		return err
	}
	res, err := r.ElasticsearchClient.PutIndexTemplate(index.GetIndexName(), body)
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

func (r *ElasticSearchIndexTemplateReconciler) deleteTemplateIndex(ctx context.Context, templateName string) error {
	res, err := r.ElasticsearchClient.DeleteIndexTemplate(ctx, templateName)
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
		return fmt.Errorf("error deleting template index: %s", res.String())
	}

	return nil
}

func (r *ElasticSearchIndexTemplateReconciler) addOrRemoveFinalizer(ctx context.Context, index *v1alpha1.ElasticsearchIndexTemplate, credentials *v1alpha1.ElasticsearchCredentials) error {
	if index.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(index, ElasticsearchIndexTemplateProtectionFinalizerName) {
		controllerutil.AddFinalizer(index, ElasticsearchIndexTemplateProtectionFinalizerName)
		if err := utils.TryAddFinalizer(ctx, r.Client, credentials, ElasticsearchIndexTemplateProtectionFinalizerName); err != nil {
			return err
		}
	}
	return nil
}

func (r *ElasticSearchIndexTemplateReconciler) handleDelete(ctx context.Context, index *v1alpha1.ElasticsearchIndexTemplate) error {
	err := r.deleteTemplateIndex(ctx, index.GetIndexName())
	if err != nil {
		return err
	}

	controllerutil.RemoveFinalizer(index, ElasticsearchIndexTemplateProtectionFinalizerName)
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *ElasticSearchIndexTemplateReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.ElasticsearchIndexTemplate{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}
