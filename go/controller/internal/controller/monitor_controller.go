package controller

import (
	"context"
	"fmt"
	"strings"

	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/common"
	"github.com/pluralsh/console/go/controller/internal/credentials"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

// MonitorReconciler reconciles a v1alpha1.Monitor object.
// Implements reconcile.Reconciler and types.Controller.
type MonitorReconciler struct {
	client.Client
	ConsoleClient    consoleclient.ConsoleClient
	Scheme           *runtime.Scheme
	CredentialsCache credentials.NamespaceCredentialsCache
}

const (
	// MonitorFinalizer defines the name for the main finalizer that synchronizes
	// resource deletion from the Console API prior to removing the CRD.
	MonitorFinalizer = "deployments.plural.sh/monitor-protection"
)

// +kubebuilder:rbac:groups=deployments.plural.sh,resources=monitors,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=monitors/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=monitors/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the v1alpha1.Monitor closer to the desired state
// and syncs it with the Console API state.
func (in *MonitorReconciler) Reconcile(ctx context.Context, req reconcile.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	monitor := new(v1alpha1.Monitor)
	if err := in.Get(ctx, req.NamespacedName, monitor); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := common.NewDefaultScope(ctx, in.Client, monitor)
	if err != nil {
		logger.Error(err, "failed to create scope")
		return ctrl.Result{}, err
	}
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	// Switch to namespace credentials if configured. This has to be done before sending any request to the console.
	nc, err := in.ConsoleClient.UseCredentials(req.Namespace, in.CredentialsCache)
	credentials.SyncCredentialsInfo(monitor, monitor.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(monitor.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	// Mark the resource as not ready. This will be overridden in the end.
	utils.MarkCondition(monitor.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	// Handle proper resource deletion via finalizer
	if result, err := in.addOrRemoveFinalizer(ctx, monitor); result != nil || err != nil {
		return common.HandleRequeue(result, err, monitor.SetCondition)
	}

	// Mark resource as managed by this operator.
	utils.MarkCondition(monitor.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")

	// Get Monitor SHA that can be saved back in the status to check for changes
	changed, sha, err := monitor.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate monitor SHA")
		utils.MarkCondition(monitor.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Get the service this monitor is attached to.
	serviceID, res, err := in.handleService(ctx, monitor)
	if res != nil || err != nil {
		return common.HandleRequeue(res, err, monitor.SetCondition)
	}

	// Get the optional workbench this monitor is attached to.
	workbenchID, res, err := in.handleWorkbenchRef(ctx, monitor)
	if res != nil || err != nil {
		return common.HandleRequeue(res, err, monitor.SetCondition)
	}

	attributes, err := monitor.Attributes(serviceID, workbenchID)
	if err != nil {
		return common.HandleRequeue(nil, err, monitor.SetCondition)
	}

	// Sync Monitor CRD with the Console API
	apiMonitor, err := in.sync(ctx, monitor, *attributes, changed)
	if err != nil {
		return common.HandleRequeue(nil, err, monitor.SetCondition)
	}

	monitor.Status.ID = &apiMonitor.ID
	monitor.Status.SHA = &sha

	utils.MarkCondition(monitor.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(monitor.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return monitor.Spec.Reconciliation.Requeue(), nil
}

// addOrRemoveFinalizer adds the finalizer or, during deletion, removes the resource from Console first.
// Console errors are returned, not requeued via Spec.Reconciliation, which never requeues without drift detection.
func (in *MonitorReconciler) addOrRemoveFinalizer(ctx context.Context, monitor *v1alpha1.Monitor) (*ctrl.Result, error) {
	if monitor.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(monitor, MonitorFinalizer) {
		controllerutil.AddFinalizer(monitor, MonitorFinalizer)
	}

	// If the monitor is being deleted, cleanup and remove the finalizer.
	if !monitor.DeletionTimestamp.IsZero() {
		// If the monitor does not have an ID, the finalizer can be removed.
		if !monitor.Status.HasID() {
			controllerutil.RemoveFinalizer(monitor, MonitorFinalizer)
			return &ctrl.Result{}, nil
		}

		exists, err := in.ConsoleClient.IsMonitorExists(ctx, monitor.Status.GetID())
		if err != nil {
			return nil, err
		}

		// Remove the monitor from Console API if it exists.
		if exists {
			if err = in.ConsoleClient.DeleteMonitor(ctx, monitor.Status.GetID()); err != nil {
				// If it fails to delete the external dependency here, return with the error
				// so that it can be retried.
				return nil, err
			}
		}

		// If our finalizer is present, remove it.
		controllerutil.RemoveFinalizer(monitor, MonitorFinalizer)

		// Stop reconciliation as the item does no longer exist.
		return &ctrl.Result{}, nil
	}

	return nil, nil
}

// handleService resolves the service ID either from the ServiceDeployment referenced by spec.serviceRef
// or from the existing Console API service referenced by spec.service ("cluster-handle/service-name").
func (in *MonitorReconciler) handleService(ctx context.Context, monitor *v1alpha1.Monitor) (string, *ctrl.Result, error) {
	if monitor.Spec.ServiceRef != nil {
		ref := monitor.Spec.ServiceRef
		ns := lo.Ternary(ref.Namespace == "", monitor.Namespace, ref.Namespace)
		service := &v1alpha1.ServiceDeployment{}
		if err := in.Get(ctx, client.ObjectKey{Name: ref.Name, Namespace: ns}, service); err != nil {
			if errors.IsNotFound(err) {
				return "", lo.ToPtr(common.Wait()), fmt.Errorf("service not found: %s", err.Error())
			}
			return "", nil, fmt.Errorf("failed to get service: %s", err.Error())
		}

		if !service.Status.HasID() {
			return "", lo.ToPtr(common.Wait()), fmt.Errorf("service is not ready")
		}

		// Make the current service the only ServiceDeployment owner.
		removeServiceOwnerReferences(monitor, service.GetUID())
		if err := controllerutil.SetOwnerReference(service, monitor, in.Scheme); err != nil {
			return "", nil, fmt.Errorf("failed to set owner reference: %w", err)
		}

		return service.Status.GetID(), nil, nil
	}

	// Drop owners left by a previous serviceRef, so that deleting that service does not delete this monitor.
	removeServiceOwnerReferences(monitor, "")

	if monitor.Spec.Service != nil {
		ref := lo.FromPtr(monitor.Spec.Service)
		split := strings.Split(ref, "/")
		if len(split) != 2 || split[0] == "" || split[1] == "" {
			return "", nil, fmt.Errorf("invalid service reference %q, expected format cluster-handle/service-name", ref)
		}

		clusterHandle, serviceName := split[0], split[1]
		service, err := in.ConsoleClient.GetServiceTinyByHandle(clusterHandle, serviceName)
		if errors.IsNotFound(err) {
			return "", lo.ToPtr(common.Wait()), fmt.Errorf("service %s not found", ref)
		}
		if err != nil {
			return "", nil, fmt.Errorf("failed to get service %s: %s", ref, err.Error())
		}

		return service.ID, nil, nil
	}

	return "", nil, fmt.Errorf("either spec.serviceRef or spec.service must be set")
}

// removeServiceOwnerReferences removes ServiceDeployment owners except the one with the given UID (empty removes all).
func removeServiceOwnerReferences(monitor *v1alpha1.Monitor, keep types.UID) {
	serviceGroup := v1alpha1.GroupVersion.Group
	monitor.SetOwnerReferences(lo.Reject(monitor.GetOwnerReferences(), func(ref v1.OwnerReference, _ int) bool {
		group, _, _ := strings.Cut(ref.APIVersion, "/")
		return group == serviceGroup && ref.Kind == "ServiceDeployment" && (keep == "" || ref.UID != keep)
	}))
}

func (in *MonitorReconciler) handleWorkbenchRef(ctx context.Context, monitor *v1alpha1.Monitor) (*string, *ctrl.Result, error) {
	if monitor.Spec.WorkbenchRef == nil {
		return nil, nil, nil
	}

	workbenchID, res, err := common.WorkbenchID(ctx, in.Client, *monitor.Spec.WorkbenchRef, monitor.Namespace)
	if res != nil || err != nil {
		return nil, res, err
	}

	return &workbenchID, nil, nil
}

func (in *MonitorReconciler) sync(ctx context.Context, monitor *v1alpha1.Monitor, attributes console.MonitorAttributes, changed bool) (*console.MonitorFragment, error) {
	logger := log.FromContext(ctx)

	// If we already have an ID, try to get the existing resource.
	if monitor.Status.HasID() {
		existingMonitor, err := in.ConsoleClient.GetMonitor(ctx, monitor.Status.GetID())
		if err != nil {
			if !errors.IsNotFound(err) {
				return nil, err
			}
			// Not found by ID, create a new one.
			logger.Info(fmt.Sprintf("monitor %s not found by ID, creating it", monitor.Name))
			return in.ConsoleClient.CreateMonitor(ctx, attributes)
		}

		if changed {
			logger.Info(fmt.Sprintf("updating monitor %s", monitor.Name))
			return in.ConsoleClient.UpdateMonitor(ctx, existingMonitor.ID, attributes)
		}

		return existingMonitor, nil
	}

	// No ID yet, create a new monitor.
	logger.Info(fmt.Sprintf("creating monitor %s", monitor.Name))
	return in.ConsoleClient.CreateMonitor(ctx, attributes)
}

// SetupWithManager is responsible for initializing a new reconciler within the provided ctrl.Manager.
func (in *MonitorReconciler) SetupWithManager(mgr ctrl.Manager) error {
	mgr.GetLogger().Info("Starting reconciler", "reconciler", "monitor_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(in.Client, new(v1alpha1.MonitorList))).
		For(&v1alpha1.Monitor{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(in)
}
