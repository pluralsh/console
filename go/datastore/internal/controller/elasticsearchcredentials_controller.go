package controller

import (
	"context"
	"crypto/tls"
	"fmt"
	"io"
	"net/http"
	"strings"

	elastic "github.com/elastic/go-elasticsearch/v9"
	corev1 "k8s.io/api/core/v1"

	"github.com/pluralsh/console/go/datastore/internal/utils"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/go/datastore/api/v1alpha1"
)

// ElasticSearchCredentialsReconciler reconciles a ElasticSearchCredentials object
type ElasticSearchCredentialsReconciler struct {
	client.Client
	Scheme *runtime.Scheme
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

	credentials := new(v1alpha1.ElasticSearchCredentials)
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

	secret, err := utils.GetSecret(ctx, r.Client, &corev1.SecretReference{Name: credentials.Spec.PasswordSecretKeyRef.Name, Namespace: credentials.Namespace})
	if err != nil {
		logger.V(5).Error(err, "failed to get password")
		return handleRequeue(nil, err, credentials.SetCondition)
	}
	key, exists := secret.Data[credentials.Spec.PasswordSecretKeyRef.Key]
	if !exists {
		return ctrl.Result{}, fmt.Errorf("secret %s does not contain key %s", credentials.Spec.PasswordSecretKeyRef.Name, credentials.Spec.PasswordSecretKeyRef.Key)
	}
	password := strings.ReplaceAll(string(key), "\n", "")

	if err := utils.TryAddControllerRef(ctx, r.Client, credentials, secret, r.Scheme); err != nil {
		logger.V(5).Error(err, "failed to add controller ref")
		return ctrl.Result{}, err
	}

	esCfg := elastic.Config{
		Addresses: []string{credentials.Spec.URL},
		Username:  credentials.Spec.Username,
		Password:  password,
	}
	if credentials.Spec.Insecure != nil && *credentials.Spec.Insecure {
		esCfg.Transport = &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: true,
			},
		}
	}

	es, err := elastic.NewClient(esCfg)
	if err != nil {
		logger.Error(err, "failed to create Elasticsearch client")
		utils.MarkCondition(credentials.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Ping or check cluster health to verify connection
	res, err := es.Cluster.Health()
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
		For(&v1alpha1.ElasticSearchCredentials{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Owns(&corev1.Secret{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})).
		Complete(r)
}
