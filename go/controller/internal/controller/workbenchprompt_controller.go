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

// WorkbenchPromptReconciler reconciles a v1alpha1.WorkbenchPrompt object.
// Implements reconcile.Reconciler and types.Controller.
type WorkbenchPromptReconciler struct {
	client.Client
	ConsoleClient    consoleclient.ConsoleClient
	Scheme           *runtime.Scheme
	CredentialsCache credentials.NamespaceCredentialsCache
}

const (
	// WorkbenchPromptFinalizer defines the name for the main finalizer that synchronizes
	// resource deletion from the Console API prior to removing the CRD.
	WorkbenchPromptFinalizer = "deployments.plural.sh/workbench-prompt-protection"
)

// +kubebuilder:rbac:groups=deployments.plural.sh,resources=workbenchprompts,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=workbenchprompts/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=workbenchprompts/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the v1alpha1.WorkbenchPrompt closer to the desired state
// and syncs it with the Console API state.
func (in *WorkbenchPromptReconciler) Reconcile(ctx context.Context, req reconcile.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	workbenchPrompt := new(v1alpha1.WorkbenchPrompt)
	if err := in.Get(ctx, req.NamespacedName, workbenchPrompt); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := common.NewDefaultScope(ctx, in.Client, workbenchPrompt)
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
	credentials.SyncCredentialsInfo(workbenchPrompt, workbenchPrompt.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(workbenchPrompt.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	// Mark the resource as not ready. This will be overridden in the end.
	utils.MarkCondition(workbenchPrompt.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	// Handle proper resource deletion via finalizer
	result := in.addOrRemoveFinalizer(ctx, workbenchPrompt)
	if result != nil {
		return *result, nil
	}

	// Mark resource as managed by this operator.
	utils.MarkCondition(workbenchPrompt.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")

	// Get WorkbenchPrompt SHA that can be saved back in the status to check for changes
	changed, sha, err := workbenchPrompt.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate workbench prompt SHA")
		utils.MarkCondition(workbenchPrompt.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Get the workbench for this prompt.
	workbenchID, res, err := common.HandleWorkbenchRef(ctx, in.Client, in.Scheme, workbenchPrompt, workbenchPrompt.Spec.WorkbenchRef, workbenchPrompt.Namespace)
	if res != nil || err != nil {
		return common.HandleRequeue(res, err, workbenchPrompt.SetCondition)
	}

	// Sync WorkbenchPrompt CRD with the Console API
	apiWorkbenchPrompt, err := in.sync(ctx, workbenchPrompt, workbenchID, changed)
	if err != nil {
		return common.HandleRequeue(nil, err, workbenchPrompt.SetCondition)
	}

	workbenchPrompt.Status.ID = &apiWorkbenchPrompt.ID
	workbenchPrompt.Status.SHA = &sha

	utils.MarkCondition(workbenchPrompt.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(workbenchPrompt.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return workbenchPrompt.Spec.Reconciliation.Requeue(), nil
}

func (in *WorkbenchPromptReconciler) addOrRemoveFinalizer(ctx context.Context, workbenchPrompt *v1alpha1.WorkbenchPrompt) *ctrl.Result {
	if workbenchPrompt.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(workbenchPrompt, WorkbenchPromptFinalizer) {
		controllerutil.AddFinalizer(workbenchPrompt, WorkbenchPromptFinalizer)
	}

	// If the workbench prompt is being deleted, cleanup and remove the finalizer.
	if !workbenchPrompt.DeletionTimestamp.IsZero() {
		// If the workbench prompt does not have an ID, the finalizer can be removed.
		if !workbenchPrompt.Status.HasID() {
			controllerutil.RemoveFinalizer(workbenchPrompt, WorkbenchPromptFinalizer)
			return &ctrl.Result{}
		}

		exists, err := in.ConsoleClient.IsWorkbenchPromptExists(ctx, workbenchPrompt.Status.GetID())
		if err != nil {
			return lo.ToPtr(workbenchPrompt.Spec.Reconciliation.Requeue())
		}

		// Remove the workbench prompt from Console API if it exists.
		if exists {
			if err = in.ConsoleClient.DeleteWorkbenchPrompt(ctx, workbenchPrompt.Status.GetID()); err != nil {
				// If it fails to delete the external dependency here, return with the error
				// so that it can be retried.
				utils.MarkCondition(workbenchPrompt.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return lo.ToPtr(workbenchPrompt.Spec.Reconciliation.Requeue())
			}
		}

		// If our finalizer is present, remove it.
		controllerutil.RemoveFinalizer(workbenchPrompt, WorkbenchPromptFinalizer)

		// Stop reconciliation as the item does no longer exist.
		return &ctrl.Result{}
	}

	return nil
}

func (in *WorkbenchPromptReconciler) sync(ctx context.Context, workbenchPrompt *v1alpha1.WorkbenchPrompt, workbenchID string, changed bool) (*console.WorkbenchPromptFragment, error) {
	logger := log.FromContext(ctx)

	// If we already have an ID, try to get the existing resource.
	if workbenchPrompt.Status.HasID() {
		existingPrompt, err := in.ConsoleClient.GetWorkbenchPrompt(ctx, workbenchPrompt.Status.GetID())
		if err != nil {
			if !errors.IsNotFound(err) {
				return nil, err
			}
			// Not found by ID, create a new one.
			logger.Info(fmt.Sprintf("workbench prompt %s not found by ID, creating it", workbenchPrompt.Name))
			return in.ConsoleClient.CreateWorkbenchPrompt(ctx, workbenchID, workbenchPrompt.Attributes())
		}

		if changed {
			logger.Info(fmt.Sprintf("updating workbench prompt %s", workbenchPrompt.Name))
			return in.ConsoleClient.UpdateWorkbenchPrompt(ctx, existingPrompt.ID, workbenchPrompt.Attributes())
		}

		return existingPrompt, nil
	}

	// No ID yet, create a new prompt.
	logger.Info(fmt.Sprintf("creating workbench prompt %s", workbenchPrompt.Name))
	return in.ConsoleClient.CreateWorkbenchPrompt(ctx, workbenchID, workbenchPrompt.Attributes())
}

// SetupWithManager is responsible for initializing a new reconciler within the provided ctrl.Manager.
func (in *WorkbenchPromptReconciler) SetupWithManager(mgr ctrl.Manager) error {
	mgr.GetLogger().Info("Starting reconciler", "reconciler", "workbench_prompt_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(in.Client, new(v1alpha1.WorkbenchPromptList))).
		For(&v1alpha1.WorkbenchPrompt{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(in)
}
