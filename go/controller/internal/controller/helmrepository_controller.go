package controller

import (
	"context"
	"fmt"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/common"
	"github.com/pluralsh/console/go/controller/internal/credentials"
	"github.com/pluralsh/console/go/controller/internal/utils"
	corev1 "k8s.io/api/core/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

// HelmRepositoryReconciler reconciles a v1alpha1.HelmRepository object.
// Implements reconcile.Reconciler and types.Controller.
type HelmRepositoryReconciler struct {
	client.Client
	ConsoleClient      consoleclient.ConsoleClient
	Scheme             *runtime.Scheme
	CredentialsCache   credentials.NamespaceCredentialsCache
	HelmRepositoryAuth *HelmRepositoryAuth
}

// SetupWithManager is responsible for initializing new reconciler within provided ctrl.Manager.
func (in *HelmRepositoryReconciler) SetupWithManager(mgr ctrl.Manager) error {
	mgr.GetLogger().Info("Starting reconciler", "reconciler", "helmrepository_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).                                                             // Requirement for credentials implementation.
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(in.Client, new(v1alpha1.HelmRepositoryList))). // Reconcile objects on credentials change.
		For(&v1alpha1.HelmRepository{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Owns(&corev1.Secret{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})).
		Complete(in)
}

// +kubebuilder:rbac:groups=deployments.plural.sh,resources=helmrepositories,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=helmrepositories/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=helmrepositories/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the v1alpha1.HelmRepository closer to the desired state
// and syncs it with the Console API state.
func (in *HelmRepositoryReconciler) Reconcile(ctx context.Context, req reconcile.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	helmRepository := new(v1alpha1.HelmRepository)
	if err := in.Get(ctx, req.NamespacedName, helmRepository); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := common.NewDefaultScope(ctx, in.Client, helmRepository)
	if err != nil {
		logger.Error(err, "failed to create scope")
		return ctrl.Result{}, err
	}
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	utils.MarkCondition(helmRepository.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

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
	// Mark resource as managed by this operator.
	utils.MarkCondition(helmRepository.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")

	// Add controller refs to secrets that this resource uses.
	err = in.tryAddOwnerRef(ctx, helmRepository)
	if err != nil {
		utils.MarkCondition(helmRepository.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Get HelmRepositoryAuth SHA that can be saved back in the status to check for changes.
	changed, sha, err := helmRepository.Diff(ctx, in.HelmRepositoryAuth.authAttributes, utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate Helm repository SHA")
		utils.MarkCondition(helmRepository.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Sync HelmRepositoryAuth CRD with the Console API.
	apiHelmRepository, err := in.sync(ctx, helmRepository, changed)
	if err != nil {
		logger.Error(err, "unable to sync Helm repository")
		utils.MarkCondition(helmRepository.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	helmRepository.Status.ID = &apiHelmRepository.ID
	helmRepository.Status.SHA = &sha

	utils.MarkCondition(helmRepository.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(helmRepository.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return helmRepository.Spec.Reconciliation.Requeue(), nil
}

func (in *HelmRepositoryReconciler) tryAddOwnerRef(ctx context.Context, helmRepository *v1alpha1.HelmRepository) error {

	secretRef := in.HelmRepositoryAuth.getAuthSecretRef(helmRepository)
	if secretRef == nil {
		return nil
	}

	secret, err := utils.GetSecret(ctx, in.Client, secretRef)
	if err != nil {
		return err
	}

	return utils.TryAddControllerRef(ctx, in.Client, helmRepository, secret, in.Scheme)
}

func (in *HelmRepositoryReconciler) sync(ctx context.Context, helmRepository *v1alpha1.HelmRepository, changed bool) (*console.HelmRepositoryFragment, error) {
	logger := log.FromContext(ctx)
	exists, err := in.ConsoleClient.IsHelmRepositoryExists(ctx, helmRepository.ConsoleName())
	if err != nil {
		return nil, err
	}

	// Read the HelmRepositoryAuth from Console API if it already exists and was not changed.
	if exists && !changed {
		return in.ConsoleClient.GetHelmRepository(ctx, helmRepository.ConsoleName())
	}

	// Upsert HelmRepositoryAuth if it does not exist or has changed.
	logger.Info(fmt.Sprintf("upserting Helm repository %s", helmRepository.ConsoleName()))
	attributes, err := helmRepository.Attributes(ctx, in.HelmRepositoryAuth.authAttributes)
	if err != nil {
		return nil, err
	}
	return in.ConsoleClient.UpsertHelmRepository(ctx, helmRepository.ConsoleName(), attributes)
}
