package controller

import (
	"context"

	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/pluralsh/console/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/controller/internal/client"
	"github.com/pluralsh/console/controller/internal/utils"
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

	scope, err := NewProjectScope(ctx, in.Client, project)
	if err != nil {
		logger.Error(err, "failed to create scope")
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
	result, err := in.addOrRemoveFinalizer(project)
	if result != nil {
		return *result, err
	}

	// Check if resource already exists in the API and only sync the ID
	exists, err := in.isAlreadyExists(ctx, project)
	if err != nil {
		utils.MarkCondition(project.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if exists {
		logger.V(9).Info("Project already exists in the API, running in read-only mode")
		utils.MarkCondition(project.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionTrue, v1alpha1.ReadonlyConditionReason, v1alpha1.ReadonlyTrueConditionMessage.String())
		return in.handleExistingProject(ctx, project)
	}

	return requeue, nil
}

func (in *ProjectReconciler) addOrRemoveFinalizer(project *v1alpha1.Project) (*ctrl.Result, error) {
	// If object is not being deleted and if it does not have our finalizer,
	// then lets add the finalizer. This is equivalent to registering our finalizer.
	if project.ObjectMeta.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(project, ProjectProtectionFinalizerName) {
		controllerutil.AddFinalizer(project, ProjectProtectionFinalizerName)
	}

	// If object is being deleted remove the finalizer. There is no way
	// currently to delete project from Console API, so we simply detach
	// and only remove the CRD.
	if !project.ObjectMeta.DeletionTimestamp.IsZero() {
		// Stop reconciliation as the item is being deleted
		controllerutil.RemoveFinalizer(project, ProjectProtectionFinalizerName)
		return &ctrl.Result{}, nil
	}

	return nil, nil
}

func (in *ProjectReconciler) isAlreadyExists(ctx context.Context, project *v1alpha1.Project) (bool, error) {
	return false, nil
}

func (in *ProjectReconciler) handleExistingProject(ctx context.Context, project *v1alpha1.Project) (ctrl.Result, error) {
	return ctrl.Result{}, nil
}

// SetupWithManager is responsible for initializing new reconciler within provided ctrl.Manager.
func (in *ProjectReconciler) SetupWithManager(mgr ctrl.Manager) error {
	mgr.GetLogger().Info("Starting reconciler", "reconciler", "project_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.Project{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(in)
}
