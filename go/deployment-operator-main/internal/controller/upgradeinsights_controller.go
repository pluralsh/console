package controller

import (
	"context"
	"time"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	k8sClient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/deployment-operator/internal/utils"
	"github.com/pluralsh/deployment-operator/pkg/client"
)

// UpgradeInsightsController reconciler a v1alpha1.UpgradeInsights resource.
// Implements [reconcile.Reconciler] interface.
type UpgradeInsightsController struct {
	k8sClient.Client

	Scheme        *runtime.Scheme
	ConsoleClient client.Client

	myCluster *console.MyCluster_MyCluster_
}

func (in *UpgradeInsightsController) Reconcile(ctx context.Context, req reconcile.Request) (_ reconcile.Result, reterr error) {
	// Read resource from Kubernetes cluster.
	ui := &v1alpha1.UpgradeInsights{}
	if err := in.Get(ctx, req.NamespacedName, ui); err != nil {
		return ctrl.Result{}, k8sClient.IgnoreNotFound(err)
	}

	if err := in.initCluster(); err != nil {
		return ctrl.Result{}, err
	}

	scope, err := NewDefaultScope(ctx, in.Client, ui)
	if err != nil {
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	// Any condition changes prior to scope setup would not be persisted
	utils.MarkCondition(ui.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(ui.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "")

	// Handle resource deletion
	result := in.handleDelete(ui)
	if result != nil {
		return *result, nil
	}

	// Sync UpgradeInsights with the Console API
	err = in.sync(ctx, ui)
	if err != nil {
		utils.MarkCondition(ui.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.ErrorConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	utils.MarkCondition(ui.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(ui.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionTrue, v1alpha1.SynchronizedConditionReason, time.Now().Format(time.RFC3339))

	return jitterRequeue(ui.Spec.GetInterval(), jitter), reterr
}

func (in *UpgradeInsightsController) handleDelete(ui *v1alpha1.UpgradeInsights) *ctrl.Result {
	// If object is not being deleted
	if ui.GetDeletionTimestamp().IsZero() {
		// do nothing
		return nil
	}

	// If object is being deleted
	return &ctrl.Result{}
}

func (in *UpgradeInsightsController) sync(ctx context.Context, ui *v1alpha1.UpgradeInsights) error {
	logger := log.FromContext(ctx)

	cloudProvider, err := NewCloudProvider(
		ui.Spec.GetDistro(in.myCluster.GetDistro()),
		in.Client,
		ui.Spec.GetClusterName(in.myCluster.GetName()),
	)
	if err != nil {
		return err
	}

	attributes, addons, err := cloudProvider.UpgradeInsights(ctx, *ui)
	if err != nil {
		logger.Error(err, "failed to sync upgrade insights")
		return err
	}

	logger.Info("successfully synced upgrade insights", "attributes", attributes, "addons", addons)
	_, err = in.ConsoleClient.SaveUpgradeInsights(lo.ToSlicePtr(attributes), lo.ToSlicePtr(addons))
	return err
}

func (in *UpgradeInsightsController) initCluster() error {
	if in.myCluster != nil {
		return nil
	}

	myCluster, err := in.ConsoleClient.MyCluster()
	if err != nil {
		return err
	}

	in.myCluster = myCluster.MyCluster
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (in *UpgradeInsightsController) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.UpgradeInsights{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(in)
}
