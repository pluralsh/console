package controller

import (
	"context"
	"fmt"
	"io"
	"strings"

	corev1 "k8s.io/api/core/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	"github.com/pluralsh/console/go/datastore/api/v1alpha1"
	"github.com/pluralsh/console/go/datastore/internal/client/elasticsearch"
	"github.com/pluralsh/console/go/datastore/internal/utils"
)

const (
	ElasticSearchCredentialsProtectionFinalizerName = "projects.deployments.plural.sh/elastic-search-credentials-protection"
)

// ElasticSearchCredentialsReconciler reconciles a ElasticsearchCredentials object
type ElasticSearchCredentialsReconciler struct {
	client.Client
	Scheme              *runtime.Scheme
	ElasticsearchClient elasticsearch.ElasticsearchClient
}

//+kubebuilder:rbac:groups=dbs.plural.sh,resources=elasticsearchcredentials,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=dbs.plural.sh,resources=elasticsearchcredentials/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=dbs.plural.sh,resources=elasticsearchcredentials/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *ElasticSearchCredentialsReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, retErr error) {
	logger := ctrl.LoggerFrom(ctx)

	credentials := new(v1alpha1.ElasticsearchCredentials)
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
		return ctrl.Result{}, r.handleDelete(ctx, credentials)
	}

	secret, err := utils.GetSecret(ctx, r.Client, &corev1.SecretReference{Name: credentials.Spec.PasswordSecretKeyRef.Name, Namespace: credentials.Namespace})
	if err != nil {
		logger.V(5).Error(err, "failed to get password")
		return handleRequeue(nil, err, credentials.SetCondition)
	}

	if err := utils.TryAddControllerRef(ctx, r.Client, credentials, secret, r.Scheme); err != nil {
		logger.V(5).Error(err, "failed to add controller ref")
		return ctrl.Result{}, err
	}
	if err := utils.TryAddFinalizer(ctx, r.Client, secret, ElasticSearchSecretProtectionFinalizerName); err != nil {
		logger.V(5).Error(err, "failed to add finalizer")
		return ctrl.Result{}, err
	}
	utils.AddFinalizer(credentials, ElasticSearchCredentialsProtectionFinalizerName)

	err = r.ElasticsearchClient.Init(ctx, r.Client, credentials)
	if err != nil {
		logger.Error(err, "failed to create Elasticsearch client")
		utils.MarkCondition(credentials.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Ping or check cluster health to verify connection
	res, err := r.ElasticsearchClient.ClusterHealth()
	if err != nil {
		logger.Error(err, "failed to connect to Elasticsearch")
		utils.MarkCondition(credentials.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	defer func(Body io.ReadCloser) {
		err := Body.Close()
		if err != nil {
			logger.Error(err, "failed to close body")
		}
	}(res.Body)

	if res.IsError() {
		err := fmt.Errorf("unauthorized or unhealthy Elasticsearch: %s", res.String())
		utils.MarkCondition(credentials.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	logger.Info("Successfully connected to Elasticsearch", "status", res.Status())

	utils.MarkCondition(credentials.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(credentials.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *ElasticSearchCredentialsReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.ElasticsearchCredentials{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Owns(&corev1.Secret{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})).
		Complete(r)
}

func (r *ElasticSearchCredentialsReconciler) handleDelete(ctx context.Context, credentials *v1alpha1.ElasticsearchCredentials) error {
	if controllerutil.ContainsFinalizer(credentials, ElasticSearchUserProtectionFinalizerName) {
		userList := &v1alpha1.ElasticsearchUserList{}
		if err := r.List(ctx, userList, client.InNamespace(credentials.Namespace)); err != nil {
			return err
		}
		for _, user := range userList.Items {
			if strings.EqualFold(user.Spec.CredentialsRef.Name, credentials.Name) {
				if err := r.Delete(ctx, &user); err != nil {
					return err
				}
			}
		}
		utils.RemoveFinalizer(credentials, ElasticSearchUserProtectionFinalizerName)
	}

	if controllerutil.ContainsFinalizer(credentials, ElasticsearchIndexTemplateProtectionFinalizerName) {
		indexTemplateList := &v1alpha1.ElasticsearchIndexTemplateList{}
		if err := r.List(ctx, indexTemplateList, client.InNamespace(credentials.Namespace)); err != nil {
			return err
		}
		for _, indexTemplate := range indexTemplateList.Items {
			if strings.EqualFold(indexTemplate.Spec.CredentialsRef.Name, credentials.Name) {
				if err := r.Delete(ctx, &indexTemplate); err != nil {
					return err
				}
			}
		}
		utils.RemoveFinalizer(credentials, ElasticsearchIndexTemplateProtectionFinalizerName)
	}
	if controllerutil.ContainsFinalizer(credentials, PolicyFinalizer) {
		policyList := &v1alpha1.ElasticsearchILMPolicyList{}
		if err := r.List(ctx, policyList, client.InNamespace(credentials.Namespace)); err != nil {
			return err
		}
		for _, policy := range policyList.Items {
			if strings.EqualFold(policy.Spec.CredentialsRef.Name, credentials.Name) {
				if err := r.Delete(ctx, &policy); err != nil {
					return err
				}
			}
		}
		utils.RemoveFinalizer(credentials, PolicyFinalizer)
	}

	if err := deleteRefSecret(ctx, r.Client, credentials.Namespace, credentials.Spec.PasswordSecretKeyRef.Name); err != nil {
		return err
	}
	utils.RemoveFinalizer(credentials, ElasticSearchCredentialsProtectionFinalizerName)
	return nil

}
