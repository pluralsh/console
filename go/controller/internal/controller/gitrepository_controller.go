package controller

import (
	"context"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	corev1 "k8s.io/api/core/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
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
		logger.Info("repository already exists in the API, running in read-only mode")
		return r.handleExistingRepo(ctx, repo)
	}

	utils.MarkCondition(repo.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")

	attrs, err := r.getRepositoryAttributes(ctx, repo)
	if err != nil {
		if errors.IsNotFound(err) {
			utils.MarkCondition(repo.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, notFoundOrReadyErrorMessage(err))
			return RequeueAfter(requeueWaitForResources), nil
		}
		utils.MarkCondition(repo.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return requeue, err
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
		logger.Info("repository created")
		apiRepo = resp.CreateGitRepository
	}

	if repo.Status.HasSHA() && !repo.Status.IsSHAEqual(sha) {
		_, err := r.ConsoleClient.UpdateRepository(apiRepo.ID, *attrs)
		if err != nil {
			utils.MarkCondition(repo.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		logger.Info("repository updated")
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

	return requeue, nil
}

func (r *GitRepositoryReconciler) handleDelete(ctx context.Context, repo *v1alpha1.GitRepository) (ctrl.Result, error) {
	logger := log.FromContext(ctx)
	if controllerutil.ContainsFinalizer(repo, RepoFinalizer) {
		logger.Info("delete git repository")
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
				return requeue, nil
			}
		}
		controllerutil.RemoveFinalizer(repo, RepoFinalizer)
	}
	return ctrl.Result{}, nil
}

func (r *GitRepositoryReconciler) getRepositoryAttributes(ctx context.Context, repo *v1alpha1.GitRepository) (*console.GitAttributes, error) {
	attrs := console.GitAttributes{URL: repo.Spec.Url}
	if repo.Spec.ConnectionRef != nil {
		connection := &v1alpha1.ScmConnection{}
		if err := r.Get(ctx, types.NamespacedName{Name: repo.Spec.ConnectionRef.Name, Namespace: repo.Spec.ConnectionRef.Namespace}, connection); err != nil {
			return nil, err
		}
		if connection.Status.ID == nil {
			return nil, apierrors.NewNotFound(schema.GroupResource{Resource: "ScmConnection", Group: "deployments.plural.sh"}, repo.Spec.ConnectionRef.Name)
		}

		if err := utils.TryAddOwnerRef(ctx, r.Client, repo, connection, r.Scheme); err != nil {
			return nil, err
		}
		attrs.ConnectionID = connection.Status.ID
	}

	if repo.Spec.CredentialsRef != nil {
		secret := &corev1.Secret{}
		name := types.NamespacedName{Name: repo.Spec.CredentialsRef.Name, Namespace: repo.Spec.CredentialsRef.Namespace}
		err := r.Get(ctx, name, secret)
		if err != nil {
			return nil, err
		}

		err = utils.TryAddOwnerRef(ctx, r.Client, repo, secret, r.Scheme)
		if err != nil {
			return nil, err
		}

		privateKey := string(secret.Data[privateKey])
		passphrase := string(secret.Data[passphrase])
		username := string(secret.Data[username])
		password := string(secret.Data[password])
		if privateKey != "" {
			attrs.PrivateKey = &privateKey
		}

		if passphrase != "" {
			attrs.Passphrase = &passphrase
		}

		if username != "" {
			attrs.Username = &username
		}

		if password != "" {
			attrs.Password = &password
		}
	}

	return &attrs, nil
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

func (r *GitRepositoryReconciler) handleExistingRepo(ctx context.Context, repo *v1alpha1.GitRepository) (reconcile.Result, error) {
	logger := log.FromContext(ctx)
	existingRepo, err := r.getRepository(repo.Spec.Url)
	if err != nil && !errors.IsNotFound(err) {
		utils.MarkCondition(repo.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if existingRepo == nil {
		msg := "Could not find Git repository in Console API"
		logger.Info(msg)
		repo.Status.Message = &msg
		repo.Status.Health = v1alpha1.GitHealthFailed
		utils.MarkCondition(repo.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonNotFound, msg)
		return requeue, nil
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
	return requeue, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *GitRepositoryReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.GitRepository{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}
