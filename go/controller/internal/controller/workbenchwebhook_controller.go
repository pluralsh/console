package controller

import (
	"context"
	"fmt"

	"github.com/pluralsh/console/go/controller/internal/common"
	"github.com/pluralsh/console/go/controller/internal/credentials"
	"sigs.k8s.io/controller-runtime/pkg/controller"

	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

// WorkbenchWebhookReconciler reconciles a v1alpha1.WorkbenchWebhook object.
// Implements reconcile.Reconciler and types.Controller.
type WorkbenchWebhookReconciler struct {
	client.Client
	ConsoleClient    consoleclient.ConsoleClient
	Scheme           *runtime.Scheme
	CredentialsCache credentials.NamespaceCredentialsCache
}

const (
	// WorkbenchWebhookFinalizer defines the name for the main finalizer that synchronizes
	// resource deletion from the Console API prior to removing the CRD.
	WorkbenchWebhookFinalizer = "deployments.plural.sh/workbench-webhook-protection"
)

// +kubebuilder:rbac:groups=deployments.plural.sh,resources=workbenchwebhooks,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=workbenchwebhooks/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=workbenchwebhooks/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the v1alpha1.WorkbenchWebhook closer to the desired state
// and syncs it with the Console API state.
func (in *WorkbenchWebhookReconciler) Reconcile(ctx context.Context, req reconcile.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	workbenchWebhook := new(v1alpha1.WorkbenchWebhook)
	if err := in.Get(ctx, req.NamespacedName, workbenchWebhook); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := common.NewDefaultScope(ctx, in.Client, workbenchWebhook)
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
	credentials.SyncCredentialsInfo(workbenchWebhook, workbenchWebhook.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(workbenchWebhook.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	// Mark the resource as not ready. This will be overridden in the end.
	utils.MarkCondition(workbenchWebhook.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	// Handle proper resource deletion via finalizer
	result := in.addOrRemoveFinalizer(ctx, workbenchWebhook)
	if result != nil {
		return *result, nil
	}

	// Mark resource as managed by this operator.
	utils.MarkCondition(workbenchWebhook.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")

	// Get WorkbenchWebhook SHA that can be saved back in the status to check for changes
	changed, sha, err := workbenchWebhook.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate workbench webhook SHA")
		utils.MarkCondition(workbenchWebhook.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Get the workbench for this webhook.
	workbenchID, res, err := common.HandleWorkbenchRef(ctx, in.Client, in.Scheme, workbenchWebhook, workbenchWebhook.Spec.WorkbenchRef, workbenchWebhook.Namespace)
	if res != nil || err != nil {
		return common.HandleRequeue(res, err, workbenchWebhook.SetCondition)
	}

	// Resolve webhook references by name if IDs are not provided directly.
	webhookID, issueWebhookID, res, err := in.resolveWebhookRefs(ctx, workbenchWebhook)
	if res != nil || err != nil {
		return common.HandleRequeue(res, err, workbenchWebhook.SetCondition)
	}

	// Sync WorkbenchWebhook CRD with the Console API
	apiWorkbenchWebhook, err := in.sync(ctx, workbenchWebhook, workbenchID, webhookID, issueWebhookID, changed)
	if err != nil {
		return common.HandleRequeue(nil, err, workbenchWebhook.SetCondition)
	}

	workbenchWebhook.Status.ID = &apiWorkbenchWebhook.ID
	workbenchWebhook.Status.SHA = &sha

	utils.MarkCondition(workbenchWebhook.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(workbenchWebhook.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return workbenchWebhook.Spec.Reconciliation.Requeue(), nil
}

func (in *WorkbenchWebhookReconciler) addOrRemoveFinalizer(ctx context.Context, workbenchWebhook *v1alpha1.WorkbenchWebhook) *ctrl.Result {
	if workbenchWebhook.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(workbenchWebhook, WorkbenchWebhookFinalizer) {
		controllerutil.AddFinalizer(workbenchWebhook, WorkbenchWebhookFinalizer)
	}

	// If the workbench webhook is being deleted, cleanup and remove the finalizer.
	if !workbenchWebhook.DeletionTimestamp.IsZero() {
		// If the workbench webhook does not have an ID, the finalizer can be removed.
		if !workbenchWebhook.Status.HasID() {
			controllerutil.RemoveFinalizer(workbenchWebhook, WorkbenchWebhookFinalizer)
			return &ctrl.Result{}
		}

		exists, err := in.ConsoleClient.IsWorkbenchWebhookExists(ctx, workbenchWebhook.Status.GetID())
		if err != nil {
			return lo.ToPtr(workbenchWebhook.Spec.Reconciliation.Requeue())
		}

		// Remove the workbench webhook from Console API if it exists.
		if exists {
			if err = in.ConsoleClient.DeleteWorkbenchWebhook(ctx, workbenchWebhook.Status.GetID()); err != nil {
				// If it fails to delete the external dependency here, return with the error
				// so that it can be retried.
				utils.MarkCondition(workbenchWebhook.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return lo.ToPtr(workbenchWebhook.Spec.Reconciliation.Requeue())
			}
		}

		// If our finalizer is present, remove it.
		controllerutil.RemoveFinalizer(workbenchWebhook, WorkbenchWebhookFinalizer)

		// Stop reconciliation as the item does no longer exist.
		return &ctrl.Result{}
	}

	return nil
}

func (in *WorkbenchWebhookReconciler) sync(ctx context.Context, workbenchWebhook *v1alpha1.WorkbenchWebhook, workbenchID string, webhookID, issueWebhookID *string, changed bool) (*console.WorkbenchWebhookFragment, error) {
	logger := log.FromContext(ctx)
	attributes := workbenchWebhook.Attributes(webhookID, issueWebhookID)

	// If we already have an ID, try to get the existing resource.
	if workbenchWebhook.Status.HasID() {
		existingWebhook, err := in.ConsoleClient.GetWorkbenchWebhook(ctx, workbenchWebhook.Status.GetID())
		if err != nil {
			if !errors.IsNotFound(err) {
				return nil, err
			}
			// Not found by ID, create a new one.
			logger.Info(fmt.Sprintf("workbench webhook %s not found by ID, creating it", workbenchWebhook.Name))
			return in.ConsoleClient.CreateWorkbenchWebhook(ctx, workbenchID, attributes)
		}

		if changed {
			logger.Info(fmt.Sprintf("updating workbench webhook %s", workbenchWebhook.Name))
			return in.ConsoleClient.UpdateWorkbenchWebhook(ctx, existingWebhook.ID, attributes)
		}

		return existingWebhook, nil
	}

	// No ID yet, create a new webhook.
	logger.Info(fmt.Sprintf("creating workbench webhook %s", workbenchWebhook.Name))
	return in.ConsoleClient.CreateWorkbenchWebhook(ctx, workbenchID, attributes)
}

func (in *WorkbenchWebhookReconciler) resolveWebhookRefs(ctx context.Context, workbenchWebhook *v1alpha1.WorkbenchWebhook) (webhookID, issueWebhookID *string, res *ctrl.Result, err error) {
	if workbenchWebhook.Spec.WebhookName != nil {
		webhook, err := in.ConsoleClient.GetObservabilityWebhookByName(ctx, *workbenchWebhook.Spec.WebhookName)
		if err != nil {
			return nil, nil, lo.ToPtr(common.Wait()), fmt.Errorf("failed to get observability webhook %q: %s", *workbenchWebhook.Spec.WebhookName, err.Error())
		}
		webhookID = &webhook.ID
	}

	if workbenchWebhook.Spec.IssueWebhookName != nil {
		webhook, err := in.ConsoleClient.GetIssueWebhookByName(ctx, *workbenchWebhook.Spec.IssueWebhookName)
		if err != nil {
			return nil, nil, lo.ToPtr(common.Wait()), fmt.Errorf("failed to get issue webhook %q: %s", *workbenchWebhook.Spec.IssueWebhookName, err.Error())
		}
		issueWebhookID = &webhook.ID
	}

	return webhookID, issueWebhookID, nil, nil
}

// SetupWithManager is responsible for initializing a new reconciler within the provided ctrl.Manager.
func (in *WorkbenchWebhookReconciler) SetupWithManager(mgr ctrl.Manager) error {
	mgr.GetLogger().Info("Starting reconciler", "reconciler", "workbench_webhook_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(in.Client, new(v1alpha1.WorkbenchWebhookList))).
		For(&v1alpha1.WorkbenchWebhook{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(in)
}
