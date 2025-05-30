package controller

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"

	"github.com/elastic/go-elasticsearch/v9"
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
	PolicyFinalizer = "deployments.plural.sh/ilmpolicy-protection"
)

// ElasticsearchILMPolicyReconciler reconciles an ElasticsearchILMPolicy object
type ElasticsearchILMPolicyReconciler struct {
	client.Client
	Scheme *runtime.Scheme
}

// +kubebuilder:rbac:groups=dbs.plural.sh,resources=elasticsearchilmpolicies,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=dbs.plural.sh,resources=elasticsearchilmpolicies/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=dbs.plural.sh,resources=elasticsearchilmpolicies/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *ElasticsearchILMPolicyReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, retErr error) {
	logger := ctrl.LoggerFrom(ctx)

	policy := new(v1alpha1.ElasticsearchILMPolicy)
	if err := r.Get(ctx, req.NamespacedName, policy); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	utils.MarkCondition(policy.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	scope, err := NewDefaultScope(ctx, r.Client, policy)
	if err != nil {
		logger.V(5).Info(err.Error())
		utils.MarkCondition(policy.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && retErr == nil {
			retErr = err
		}
	}()

	credentials := new(v1alpha1.ElasticSearchCredentials)
	if err := r.Get(ctx, types.NamespacedName{Name: policy.Spec.CredentialsRef.Name, Namespace: policy.Namespace}, credentials); err != nil {
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
		utils.MarkCondition(policy.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	if !policy.GetDeletionTimestamp().IsZero() {
		logger.Error(err, "failed to delete ILM policy", "policy", policy.Name, "namespace", policy.Namespace)
		return ctrl.Result{}, r.delete(ctx, es, policy)
	}

	if err = r.sync(ctx, es, policy); err != nil {
		logger.Error(err, "failed to sync ILM policy", "policy", policy.Name, "namespace", policy.Namespace)
		return ctrl.Result{}, err
	}

	if !controllerutil.ContainsFinalizer(policy, PolicyFinalizer) {
		controllerutil.AddFinalizer(policy, PolicyFinalizer)
	}

	utils.MarkCondition(policy.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(policy.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return ctrl.Result{}, nil
}

func (r *ElasticsearchILMPolicyReconciler) delete(ctx context.Context, es *elasticsearch.Client, policy *v1alpha1.ElasticsearchILMPolicy) error {
	if controllerutil.ContainsFinalizer(policy, PolicyFinalizer) {
		res, err := es.ILM.DeleteLifecycle(policy.Name)
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
			return fmt.Errorf("failed to delete ILM policy: %s", res.String())
		}
		controllerutil.RemoveFinalizer(policy, PolicyFinalizer)
	}

	return nil
}

func (r *ElasticsearchILMPolicyReconciler) sync(ctx context.Context, es *elasticsearch.Client, policy *v1alpha1.ElasticsearchILMPolicy) error {
	body, err := json.Marshal(policy.Spec.Definition.Policy)
	if err != nil {
		return err
	}

	res, err := es.ILM.PutLifecycle(policy.Name, es.ILM.PutLifecycle.WithBody(bytes.NewReader(body)))
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
		return fmt.Errorf("failed to create ILM policy: %s", res.String())
	}

	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *ElasticsearchILMPolicyReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.ElasticsearchILMPolicy{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}
