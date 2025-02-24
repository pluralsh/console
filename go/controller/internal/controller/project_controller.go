package controller

import (
	"context"
	"fmt"

	"k8s.io/apimachinery/pkg/runtime/schema"

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
	"github.com/pluralsh/console/go/controller/internal/cache"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

// ProjectReconciler reconciles a v1alpha1.Project object.
// Implements reconcile.Reconciler and types.Controller.
type ProjectReconciler struct {
	client.Client

	ConsoleClient  consoleclient.ConsoleClient
	Scheme         *runtime.Scheme
	UserGroupCache cache.UserGroupCache
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

	// Handle proper resource deletion via finalizer
	result := in.addOrRemoveFinalizer(ctx, project)
	if result != nil {
		return *result, nil
	}

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

	return requeue, nil
}

func (in *ProjectReconciler) addOrRemoveFinalizer(ctx context.Context, project *v1alpha1.Project) *ctrl.Result {
	// If object is not being deleted and if it does not have our finalizer,
	// then lets add the finalizer. This is equivalent to registering our finalizer.
	if project.ObjectMeta.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(project, ProjectProtectionFinalizerName) {
		controllerutil.AddFinalizer(project, ProjectProtectionFinalizerName)
	}

	// If object is being deleted remove the finalizer. There is no way
	// currently to delete project from Console API, so we simply detach
	// and only remove the CRD.
	if !project.ObjectMeta.DeletionTimestamp.IsZero() {
		exists, err := in.ConsoleClient.IsProjectExists(ctx, project.Spec.Name)
		if err != nil {
			return &requeue
		}

		// Remove project from Console API if it exists and is not readonly
		if exists && !project.Status.IsReadonly() {
			if err := in.ConsoleClient.DeleteProject(ctx, project.Status.GetID()); err != nil {
				// If it fails to delete the external dependency here, return with error
				// so that it can be retried.
				utils.MarkCondition(project.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return &requeue
			}

			// project deletion is synchronous so can just fall back to removing the finalizer and reconciling
		}
		// Stop reconciliation as the item is being deleted
		controllerutil.RemoveFinalizer(project, ProjectProtectionFinalizerName)
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
	exists, err := in.ConsoleClient.IsProjectExists(ctx, project.ConsoleName())
	if err != nil {
		return ctrl.Result{}, err
	}

	if !exists {
		project.Status.ID = nil
		utils.MarkCondition(project.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonNotFound, v1alpha1.SynchronizedNotFoundConditionMessage.String())
		return ctrl.Result{}, nil
	}

	apiProject, err := in.ConsoleClient.GetProject(ctx, nil, lo.ToPtr(project.ConsoleName()))
	if err != nil {
		utils.MarkCondition(project.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	project.Status.ID = &apiProject.ID

	utils.MarkCondition(project.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(project.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return requeue, nil
}

func (in *ProjectReconciler) sync(ctx context.Context, project *v1alpha1.Project, changed bool) (*console.ProjectFragment, error) {
	logger := log.FromContext(ctx)
	exists, err := in.ConsoleClient.IsProjectExists(ctx, project.ConsoleName())
	if err != nil {
		return nil, err
	}

	if err := in.ensure(project); err != nil {
		return nil, err
	}

	// Update only if Project has changed
	if changed && exists {
		logger.Info(fmt.Sprintf("updating project %s", project.ConsoleName()))
		return in.ConsoleClient.UpdateProject(ctx, project.Status.GetID(), project.Attributes())
	}

	// Read the Project from Console API if it already exists
	if exists {
		return in.ConsoleClient.GetProject(ctx, nil, lo.ToPtr(project.ConsoleName()))
	}

	logger.Info(fmt.Sprintf("%s project does not exist, creating it", project.ConsoleName()))
	return in.ConsoleClient.CreateProject(ctx, project.Attributes())
}

// ensure makes sure that user-friendly input such as userEmail/groupName in
// bindings are transformed into valid IDs on the v1alpha1.Binding object before creation
func (in *ProjectReconciler) ensure(project *v1alpha1.Project) error {
	if project.Spec.Bindings == nil {
		return nil
	}

	bindings, req, err := ensureBindings(project.Spec.Bindings.Read, in.UserGroupCache)
	if err != nil {
		return err
	}
	project.Spec.Bindings.Read = bindings

	bindings, req2, err := ensureBindings(project.Spec.Bindings.Write, in.UserGroupCache)
	if err != nil {
		return err
	}
	project.Spec.Bindings.Write = bindings

	if req || req2 {
		return errors.NewNotFound(schema.GroupResource{}, "bindings")
	}

	return nil
}

// SetupWithManager is responsible for initializing new reconciler within provided ctrl.Manager.
func (in *ProjectReconciler) SetupWithManager(mgr ctrl.Manager) error {
	mgr.GetLogger().Info("Starting reconciler", "reconciler", "project_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.Project{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(in)
}
