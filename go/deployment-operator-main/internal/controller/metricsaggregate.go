package controller

import (
	"context"
	"time"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	k8sClient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/deployment-operator/internal/utils"
	discoverycache "github.com/pluralsh/deployment-operator/pkg/cache/discovery"
	"github.com/pluralsh/deployment-operator/pkg/common"
	"github.com/pluralsh/deployment-operator/pkg/scraper"
)

const (
	globalName       = "global"
	debounceDuration = time.Second * 30
)

// MetricsAggregateReconciler reconciles a MetricsAggregate resource.
type MetricsAggregateReconciler struct {
	k8sClient.Client
	Scheme         *runtime.Scheme
	DiscoveryCache discoverycache.Cache
}

// Reconcile IngressReplica ensure that stays in sync with Kubernetes cluster.
func (r *MetricsAggregateReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	metricsAPIAvailable := common.SupportedMetricsAPIVersionAvailable(r.DiscoveryCache.GroupVersion().List())
	if !metricsAPIAvailable {
		logger.V(5).Info("metrics api not available")
		return jitterRequeue(time.Minute*5, jitter), nil
	}

	// Read resource from Kubernetes cluster.
	metrics := &v1alpha1.MetricsAggregate{}
	if err := r.Get(ctx, req.NamespacedName, metrics); err != nil {
		if apierrors.IsNotFound(err) {
			if err := r.initGlobalMetricsAggregate(ctx); err != nil {
				return ctrl.Result{}, err
			}
			return jitterRequeue(time.Second, jitter), nil
		}
		return ctrl.Result{}, err
	}

	logger.V(5).Info("reconciling MetricsAggregate", "namespace", metrics.Namespace, "name", metrics.Name)
	utils.MarkCondition(metrics.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	scope, err := NewDefaultScope(ctx, r.Client, metrics)
	if err != nil {
		logger.V(3).Error(err, "failed to create scope")
		utils.MarkCondition(metrics.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	if !metrics.DeletionTimestamp.IsZero() {
		return ctrl.Result{}, nil
	}

	metrics.Status = scraper.GetMetrics().Get()
	utils.MarkCondition(metrics.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return jitterRequeue(time.Second*5, jitter), reterr
}

// SetupWithManager sets up the controller with the Manager.
func (r *MetricsAggregateReconciler) SetupWithManager(ctx context.Context, mgr ctrl.Manager) error {
	debounceReconciler := NewDebounceReconciler(mgr.GetClient(), time.Second*10, r)
	debounceReconciler.Start(ctx)

	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.MetricsAggregate{}).
		Complete(debounceReconciler)
}

func (r *MetricsAggregateReconciler) initGlobalMetricsAggregate(ctx context.Context) error {
	// Init global MetricsAggregate object
	if err := r.Get(ctx, k8sClient.ObjectKey{Name: globalName}, &v1alpha1.MetricsAggregate{}); err != nil {
		if apierrors.IsNotFound(err) {
			if err := r.Create(ctx, &v1alpha1.MetricsAggregate{
				ObjectMeta: metav1.ObjectMeta{
					Name: globalName,
				},
			}); err != nil {
				return err
			}
		} else {
			return err
		}
	}
	return nil
}
