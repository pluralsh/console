package controller

import (
	"context"
	goerrors "errors"
	"fmt"

	"github.com/pluralsh/console/go/controller/internal/credentials"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	console "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/cache"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	operrors "github.com/pluralsh/console/go/controller/internal/errors"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

// HelmRepositoryReconciler reconciles a v1alpha1.HelmRepository object.
// Implements reconcile.Reconciler and types.Controller.
type HelmRepositoryReconciler struct {
	client.Client
	ConsoleClient    consoleclient.ConsoleClient
	Scheme           *runtime.Scheme
	UserGroupCache   cache.UserGroupCache
	CredentialsCache credentials.NamespaceCredentialsCache
}

const (
	// HelmRepositoryProtectionFinalizerName defines name for the main finalizer that synchronizes
	// resource deletion from the Console API prior to removing the CRD.
	HelmRepositoryProtectionFinalizerName = "helmRepositorys.deployments.plural.sh/helmRepository-protection"
)

// +kubebuilder:rbac:groups=deployments.plural.sh,resources=helmRepositorys,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=helmRepositorys/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=helmRepositorys/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the v1alpha1.HelmRepository closer to the desired state
// and syncs it with the Console API state.
func (in *HelmRepositoryReconciler) Reconcile(ctx context.Context, req reconcile.Request) (_ reconcile.Result, retErr error) {
	logger := log.FromContext(ctx)

	helmRepository := new(v1alpha1.HelmRepository)
	if err := in.Get(ctx, req.NamespacedName, helmRepository); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	utils.MarkCondition(helmRepository.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	scope, err := NewHelmRepositoryScope(ctx, in.Client, helmRepository)
	if err != nil {
		logger.Error(err, "failed to create scope")
		utils.MarkCondition(helmRepository.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && retErr == nil {
			retErr = err
		}
	}()

	// Switch to namespace credentials if configured. This has to be done before sending any request to the console.
	nc, err := in.ConsoleClient.UseCredentials(req.Namespace, in.CredentialsCache)
	credentials.SyncCredentialsInfo(helmRepository, helmRepository.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(helmRepository.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	// Mark resource as not ready. This will be overridden in the end.
	utils.MarkCondition(helmRepository.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	// TODO: Handle proper resource deletion via finalizer once it will be possible.

	// Check if resource already exists in the API and only sync the ID
	exists, err := in.isAlreadyExists(ctx, helmRepository)
	if err != nil {
		utils.MarkCondition(helmRepository.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if exists {
		utils.MarkCondition(helmRepository.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionTrue, v1alpha1.ReadonlyConditionReason, v1alpha1.ReadonlyTrueConditionMessage.String())
		return in.handleExistingHelmRepository(ctx, helmRepository)
	}

	// Mark resource as managed by this operator.
	utils.MarkCondition(helmRepository.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")

	// Get HelmRepository SHA that can be saved back in the status to check for changes
	changed, sha, err := helmRepository.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate helmRepository SHA")
		utils.MarkCondition(helmRepository.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Sync HelmRepository CRD with the Console API
	apiHelmRepository, err := in.sync(ctx, helmRepository, changed)
	if goerrors.Is(err, operrors.ErrRetriable) {
		utils.MarkCondition(helmRepository.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return requeue, nil
	}

	if err != nil {
		logger.Error(err, "unable to create or update helmRepository")
		utils.MarkCondition(helmRepository.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	helmRepository.Status.ID = &apiHelmRepository.ID
	helmRepository.Status.SHA = &sha

	utils.MarkCondition(helmRepository.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(helmRepository.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return requeue, nil
}

func (in *HelmRepositoryReconciler) isAlreadyExists(ctx context.Context, helmRepository *v1alpha1.HelmRepository) (bool, error) {
	_, err := in.ConsoleClient.GetHelmRepository(ctx, helmRepository.ConsoleName())
	if errors.IsNotFound(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	if !helmRepository.Status.HasID() {
		log.FromContext(ctx).Info("HelmRepository already exists in the API, running in read-only mode")
		return true, nil
	}

	return false, nil
}

func (in *HelmRepositoryReconciler) handleExistingHelmRepository(ctx context.Context, helmRepository *v1alpha1.HelmRepository) (ctrl.Result, error) {
	exists, err := in.ConsoleClient.IsHelmRepositoryExists(ctx, helmRepository.ConsoleName())
	if err != nil {
		return ctrl.Result{}, err
	}

	if !exists {
		helmRepository.Status.ID = nil
		utils.MarkCondition(helmRepository.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonNotFound, v1alpha1.SynchronizedNotFoundConditionMessage.String())
		return ctrl.Result{}, nil
	}

	apiHelmRepository, err := in.ConsoleClient.GetHelmRepository(ctx, helmRepository.ConsoleName())
	if err != nil {
		utils.MarkCondition(helmRepository.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	helmRepository.Status.ID = &apiHelmRepository.ID

	utils.MarkCondition(helmRepository.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(helmRepository.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return requeue, nil
}

func (in *HelmRepositoryReconciler) sync(ctx context.Context, helmRepository *v1alpha1.HelmRepository, changed bool) (*console.HelmRepositoryFragment, error) {
	logger := log.FromContext(ctx)
	exists, err := in.ConsoleClient.IsHelmRepositoryExists(ctx, helmRepository.ConsoleName())
	if err != nil {
		return nil, err
	}

	// Read the HelmRepository from Console API if it already exists and was not changed
	if exists && !changed {
		return in.ConsoleClient.GetHelmRepository(ctx, helmRepository.ConsoleName())
	}

	// Upsert HelmRepository if it does not exist or has changed
	logger.Info(fmt.Sprintf("upserting helmRepository %s", helmRepository.ConsoleName()))
	return in.ConsoleClient.UpsertHelmRepository(ctx, helmRepository.ConsoleName(), helmRepository.Attributes())
}

// SetupWithManager is responsible for initializing new reconciler within provided ctrl.Manager.
func (in *HelmRepositoryReconciler) SetupWithManager(mgr ctrl.Manager) error {
	mgr.GetLogger().Info("Starting reconciler", "reconciler", "helmRepository_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).                                                             // Requirement for credentials implementation.
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(in.Client, new(v1alpha1.HelmRepositoryList))). // Reconcile objects on credentials change.
		For(&v1alpha1.HelmRepository{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(in)
}

// todo attributes
// todo annotations
// todo samples
// todo tests
