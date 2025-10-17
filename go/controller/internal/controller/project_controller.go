package controller

import (
	"context"
	"fmt"

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

// ProjectReconciler reconciles a v1alpha1.Project object.
// Implements reconcile.Reconciler and types.Controller.
type ProjectReconciler struct {
	client.Client
	ConsoleClient consoleclient.ConsoleClient
	Scheme        *runtime.Scheme
}

const (
	// ProjectProtectionFinalizerName defines name for the main finalizer that synchronizes
	// resource deletion from the Console API prior to removing the CRD.
	ProjectProtectionFinalizerName = "projects.deployments.plural.sh/project-protection"
)

// +kubebuilder:rbac:groups=deployments.plural.sh,resources=projects,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=projects/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=projects/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the v1alpha1.Project closer to the desired state
// and syncs it with the Console API state.
func (in *ProjectReconciler) Reconcile(ctx context.Context, req reconcile.Request) (_ reconcile.Result, retErr error) {
	logger := log.FromContext(ctx)

	project := new(v1alpha1.Project)
	if err := in.Get(ctx, req.NamespacedName, project); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	utils.MarkCondition(project.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	scope, err := NewDefaultScope(ctx, in.Client, project)
	if err != nil {
		utils.MarkCondition(project.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && retErr == nil {
			retErr = err
		}
	}()

	// Mark resource as not ready. This will be overridden in the end.
	utils.MarkCondition(project.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	// Check if resource already exists in the API and only sync the ID
	exists, err := in.isAlreadyExists(ctx, project)
	if err != nil {
		utils.MarkCondition(project.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if exists {
		utils.MarkCondition(project.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionTrue, v1alpha1.ReadonlyConditionReason, v1alpha1.ReadonlyTrueConditionMessage.String())
		return in.handleExistingProject(ctx, project)
	}

	// Handle proper resource deletion via finalizer
	result := in.addOrRemoveFinalizer(ctx, project)
	if result != nil {
		return *result, nil
	}

	// Mark resource as managed by this operator.
	utils.MarkCondition(project.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")

	// Get Project SHA that can be saved back in the status to check for changes
	changed, sha, err := project.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate project SHA")
		utils.MarkCondition(project.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Sync Project CRD with the Console API
	apiProject, err := in.sync(ctx, project, changed)
	if err != nil {
		return handleRequeue(nil, err, project.SetCondition)
	}

	project.Status.ID = &apiProject.ID
	project.Status.SHA = &sha

	utils.MarkCondition(project.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(project.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return jitterRequeue(requeueDefault), nil
}

func (in *ProjectReconciler) addOrRemoveFinalizer(ctx context.Context, project *v1alpha1.Project) *ctrl.Result {
	if project.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(project, ProjectProtectionFinalizerName) {
		controllerutil.AddFinalizer(project, ProjectProtectionFinalizerName)
	}

	// If the project is being deleted, cleanup and remove the finalizer.
	if !project.DeletionTimestamp.IsZero() {
		// If the project does not have an ID, the finalizer can be removed.
		if !project.Status.HasID() {
			controllerutil.RemoveFinalizer(project, ProjectProtectionFinalizerName)
			return &ctrl.Result{}
		}

		exists, err := in.ConsoleClient.IsProjectExists(ctx, project.Status.ID, nil)
		if err != nil {
			return lo.ToPtr(jitterRequeue(requeueDefault))
		}

		// Remove project from Console API if it exists.
		if exists {
			if err = in.ConsoleClient.DeleteProject(ctx, project.Status.GetID()); err != nil {
				// If it fails to delete the external dependency here, return with the error
				// so that it can be retried.
				utils.MarkCondition(project.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return lo.ToPtr(jitterRequeue(requeueDefault))
			}
		}

		// If our finalizer is present, remove it.
		controllerutil.RemoveFinalizer(project, ProjectProtectionFinalizerName)

		// Stop reconciliation as the item does no longer exist.
		return &ctrl.Result{}
	}

	return nil
}

func (in *ProjectReconciler) isAlreadyExists(ctx context.Context, project *v1alpha1.Project) (bool, error) {
	if project.Status.HasReadonlyCondition() {
		return project.Status.IsReadonly(), nil
	}

	_, err := in.ConsoleClient.GetProject(ctx, nil, lo.ToPtr(project.ConsoleName()))
	if errors.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	if !project.Status.HasID() {
		log.FromContext(ctx).Info("Project already exists in the API, running in read-only mode")
		return true, nil
	}

	return false, nil
}

func (in *ProjectReconciler) handleExistingProject(ctx context.Context, project *v1alpha1.Project) (ctrl.Result, error) {
	// After changes done in #2389 finalizers are no longer added to read-only resources.
	// The following block ensures that finalizers will be removed from all already existing read-only resources;
	// it can be removed after a transition period.
	if controllerutil.ContainsFinalizer(project, ProjectProtectionFinalizerName) {
		controllerutil.RemoveFinalizer(project, ProjectProtectionFinalizerName)
	}

	exists, err := in.ConsoleClient.IsProjectExists(ctx, nil, lo.ToPtr(project.ConsoleName()))
	if err != nil {
		return handleRequeue(nil, err, project.SetCondition)
	}

	if !exists {
		project.Status.ID = nil
		utils.MarkCondition(project.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonNotFound, v1alpha1.SynchronizedNotFoundConditionMessage.String())
		return waitForResources(), nil
	}

	apiProject, err := in.ConsoleClient.GetProject(ctx, nil, lo.ToPtr(project.ConsoleName()))
	if err != nil {
		return handleRequeue(nil, err, project.SetCondition)
	}

	project.Status.ID = &apiProject.ID

	utils.MarkCondition(project.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(project.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return jitterRequeue(requeueDefault), nil
}

func (in *ProjectReconciler) attributes(project *v1alpha1.Project) (*console.ProjectAttributes, error) {
	attrs := &console.ProjectAttributes{
		Name:        project.ConsoleName(),
		Description: project.Spec.Description,
	}

	if project.Spec.Bindings != nil {
		var err error

		attrs.ReadBindings, err = bindingsAttributes(project.Spec.Bindings.Read)
		if err != nil {
			return nil, err
		}

		attrs.WriteBindings, err = bindingsAttributes(project.Spec.Bindings.Write)
		if err != nil {
			return nil, err
		}
	}

	return attrs, nil
}

func (in *ProjectReconciler) sync(ctx context.Context, project *v1alpha1.Project, changed bool) (*console.ProjectFragment, error) {
	logger := log.FromContext(ctx)
	exists, err := in.ConsoleClient.IsProjectExists(ctx, nil, lo.ToPtr(project.ConsoleName()))
	if err != nil {
		return nil, err
	}

	// Update only if Project has changed
	if changed && exists {
		attrs, err := in.attributes(project)
		if err != nil {
			return nil, err
		}

		logger.Info(fmt.Sprintf("updating project %s", project.ConsoleName()))
		return in.ConsoleClient.UpdateProject(ctx, project.Status.GetID(), *attrs)
	}

	// Read the Project from Console API if it already exists
	if exists {
		return in.ConsoleClient.GetProject(ctx, nil, lo.ToPtr(project.ConsoleName()))
	}

	attrs, err := in.attributes(project)
	if err != nil {
		return nil, err
	}

	logger.Info(fmt.Sprintf("%s project does not exist, creating it", project.ConsoleName()))
	return in.ConsoleClient.CreateProject(ctx, *attrs)
}

// SetupWithManager is responsible for initializing new reconciler within provided ctrl.Manager.
func (in *ProjectReconciler) SetupWithManager(mgr ctrl.Manager) error {
	mgr.GetLogger().Info("Starting reconciler", "reconciler", "project_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.Project{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(in)
}
