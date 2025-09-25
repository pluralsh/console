package controller

import (
	"context"
	"fmt"

	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
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
	"github.com/pluralsh/console/go/controller/internal/errors"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

const (
	RepoFinalizer = "deployments.plural.sh/gitrepo-protection"
	privateKey    = "privateKey"
	passphrase    = "passphrase"
	username      = "username"
	password      = "password"
)

type GitRepoCred struct {
	PrivateKey *string
	Passphrase *string
	Username   *string
	Password   *string
}

// GitRepositoryReconciler reconciles a GitRepository object
type GitRepositoryReconciler struct {
	client.Client
	ConsoleClient consoleclient.ConsoleClient
	Scheme        *runtime.Scheme
}

// +kubebuilder:rbac:groups=deployments.plural.sh,resources=gitrepositories,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=gitrepositories/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=gitrepositories/finalizers,verbs=update
// +kubebuilder:rbac:groups=core,resources=secrets,verbs=get;list;watch;patch

func (r *GitRepositoryReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := log.FromContext(ctx)
	repo := &v1alpha1.GitRepository{}
	if err := r.Get(ctx, req.NamespacedName, repo); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	utils.MarkCondition(repo.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
	scope, err := NewDefaultScope(ctx, r.Client, repo)
	if err != nil {
		utils.MarkCondition(repo.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	if !repo.GetDeletionTimestamp().IsZero() {
		return r.handleDelete(ctx, repo)
	}

	// Check if resource already exists in the API and only sync the ID
	exists, err := r.isAlreadyExists(repo)
	if err != nil {
		utils.MarkCondition(repo.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if exists {
		logger.V(9).Info("repository already exists, running in read-only mode", "name", repo.Name, "namespace", repo.Namespace)
		return r.handleExistingRepo(repo)
	}

	utils.MarkCondition(repo.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")

	attrs, result, err := r.getRepositoryAttributes(ctx, repo)
	if result != nil || err != nil {
		return handleRequeue(result, err, repo.SetCondition)
	}

	sha, err := utils.HashObject(attrs)
	if err != nil {
		utils.MarkCondition(repo.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	apiRepo, err := r.getRepository(repo.Spec.Url)
	if err != nil && !errors.IsNotFound(err) {
		utils.MarkCondition(repo.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if apiRepo == nil {
		controllerutil.AddFinalizer(repo, RepoFinalizer)
		resp, err := r.ConsoleClient.CreateGitRepository(*attrs)
		if err != nil {
			utils.MarkCondition(repo.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		apiRepo = resp.CreateGitRepository
		logger.V(9).Info("created repository", "id", apiRepo.ID, "name", repo.Name, "namespace", repo.Namespace)
	}

	if repo.Status.HasSHA() && !repo.Status.IsSHAEqual(sha) {
		if _, err := r.ConsoleClient.UpdateRepository(apiRepo.ID, *attrs); err != nil {
			utils.MarkCondition(repo.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		logger.V(9).Info("updated repository", "id", apiRepo.ID, "name", repo.Name, "namespace", repo.Namespace)
	}

	repo.Status.Message = apiRepo.Error
	repo.Status.ID = &apiRepo.ID
	if apiRepo.Health != nil {
		repo.Status.Health = v1alpha1.GitHealth(*apiRepo.Health)
	}
	repo.Status.SHA = &sha

	utils.MarkCondition(repo.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "The repository is not pullable yet")
	if apiRepo.Health != nil && *apiRepo.Health == console.GitHealthPullable {
		utils.MarkCondition(repo.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	}
	utils.MarkCondition(repo.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return jitterRequeue(requeueDefault), nil
}

func (r *GitRepositoryReconciler) handleDelete(ctx context.Context, repo *v1alpha1.GitRepository) (ctrl.Result, error) {
	logger := log.FromContext(ctx)
	if controllerutil.ContainsFinalizer(repo, RepoFinalizer) {
		existingRepo, err := r.getRepository(repo.Spec.Url)
		if err != nil && !errors.IsNotFound(err) {
			utils.MarkCondition(repo.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}

		if existingRepo != nil && !repo.Status.IsReadonly() && repo.Status.HasID() {
			if err := r.ConsoleClient.DeleteRepository(*repo.Status.ID); err != nil {
				if !errors.IsDeleteRepository(err) {
					utils.MarkCondition(repo.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
					return ctrl.Result{}, err
				}
				logger.Info("waiting for the services")
				return jitterRequeue(requeueDefault), nil
			}
		}
		controllerutil.RemoveFinalizer(repo, RepoFinalizer)
	}
	return ctrl.Result{}, nil
}

func (r *GitRepositoryReconciler) getRepositoryAttributes(ctx context.Context, repo *v1alpha1.GitRepository) (*console.GitAttributes, *ctrl.Result, error) {
	attrs := console.GitAttributes{URL: repo.Spec.Url}
	if repo.Spec.ConnectionRef != nil {
		connection := &v1alpha1.ScmConnection{}
		ref := repo.Spec.ConnectionRef
		if err := r.Get(ctx, types.NamespacedName{Name: ref.Name, Namespace: ref.Namespace}, connection); err != nil {
			return nil, nil, err
		}
		if !connection.Status.HasID() {
			return nil, lo.ToPtr(jitterRequeue(requeueWaitForResources)), fmt.Errorf("scm connection is not ready")
		}

		if err := utils.TryAddOwnerRef(ctx, r.Client, repo, connection, r.Scheme); err != nil {
			return nil, nil, err
		}
		attrs.ConnectionID = connection.Status.ID
	}

	if repo.Spec.CredentialsRef != nil {
		secret := &corev1.Secret{}
		ref := repo.Spec.CredentialsRef
		if err := r.Get(ctx, types.NamespacedName{Name: ref.Name, Namespace: ref.Namespace}, secret); err != nil {
			return nil, nil, err
		}

		if err := utils.TryAddOwnerRef(ctx, r.Client, repo, secret, r.Scheme); err != nil {
			return nil, nil, err
		}

		attrs.PrivateKey = lo.EmptyableToPtr(string(secret.Data[privateKey]))
		attrs.Passphrase = lo.EmptyableToPtr(string(secret.Data[passphrase]))
		attrs.Username = lo.EmptyableToPtr(string(secret.Data[username]))
		attrs.Password = lo.EmptyableToPtr(string(secret.Data[password]))
	}

	return &attrs, nil, nil
}

func (r *GitRepositoryReconciler) getRepository(url string) (*console.GitRepositoryFragment, error) {
	existingRepos, err := r.ConsoleClient.GetRepository(&url)
	if err != nil {
		return nil, err
	}

	return existingRepos.GitRepository, nil
}

func (r *GitRepositoryReconciler) isAlreadyExists(repository *v1alpha1.GitRepository) (bool, error) {
	if controllerutil.ContainsFinalizer(repository, RepoFinalizer) {
		return false, nil
	}
	if repository.Status.HasReadonlyCondition() {
		return repository.Status.IsReadonly(), nil
	}

	repo, err := r.getRepository(repository.Spec.Url)
	if err == nil && repo == nil {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return !repository.Status.HasID(), nil
}

func (r *GitRepositoryReconciler) handleExistingRepo(repo *v1alpha1.GitRepository) (reconcile.Result, error) {
	existingRepo, err := r.getRepository(repo.Spec.Url)
	if err != nil && !errors.IsNotFound(err) {
		utils.MarkCondition(repo.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if existingRepo == nil {
		msg := "could not find the repository"
		repo.Status.Message = &msg
		repo.Status.Health = v1alpha1.GitHealthFailed
		utils.MarkCondition(repo.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonNotFound, msg)
		return jitterRequeue(requeueDefault), nil
	}

	repo.Status.Message = existingRepo.Error
	repo.Status.ID = &existingRepo.ID
	if existingRepo.Health != nil {
		repo.Status.Health = v1alpha1.GitHealth(*existingRepo.Health)
	}

	utils.MarkCondition(repo.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "The repository is not pullable yet")
	if existingRepo.Health != nil && *existingRepo.Health == console.GitHealthPullable {
		utils.MarkCondition(repo.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	}
	utils.MarkCondition(repo.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionTrue, v1alpha1.ReadonlyConditionReason, v1alpha1.ReadonlyTrueConditionMessage.String())
	utils.MarkCondition(repo.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	return jitterRequeue(requeueDefault), nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *GitRepositoryReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.GitRepository{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}
