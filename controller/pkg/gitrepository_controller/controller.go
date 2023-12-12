package gitrepositorycontroller

import (
	"context"
	"fmt"
	"time"

	"github.com/go-logr/logr"
	console "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/console/controller/apis/deployments/v1alpha1"
	consoleclient "github.com/pluralsh/console/controller/pkg/client"
	"github.com/pluralsh/console/controller/pkg/errors"
	"github.com/pluralsh/console/controller/pkg/kubernetes"
	"github.com/pluralsh/console/controller/pkg/utils"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
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

// Reconciler reconciles a GitRepository object
type Reconciler struct {
	client.Client
	ConsoleClient consoleclient.ConsoleClient
	Log           logr.Logger
	Scheme        *runtime.Scheme
}

func (r *Reconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Log.WithName(fmt.Sprintf("%s-%s", req.NamespacedName, req.Name))
	repo := &v1alpha1.GitRepository{}
	if err := r.Get(ctx, req.NamespacedName, repo); err != nil {
		if apierrors.IsNotFound(err) {
			return ctrl.Result{}, nil
		}
		return ctrl.Result{}, err
	}
	if !repo.GetDeletionTimestamp().IsZero() {
		return r.handleDelete(ctx, repo)
	}
	cred, err := r.getRepositoryCredentials(ctx, repo)
	if err != nil {
		return ctrl.Result{}, err
	}
	sha, err := utils.HashObject(cred)
	if err != nil {
		return ctrl.Result{}, err
	}

	existingRepo, err := r.getRepository(repo.Spec.Url)
	if err != nil && !errors.IsNotFound(err) {
		return ctrl.Result{}, err
	}
	if existingRepo == nil && repo.Status.Existing == true {
		msg := "existing Git repository was deleted from the console"
		r.Log.Info(msg)
		if err = utils.TryUpdateStatus[*v1alpha1.GitRepository](ctx, r.Client, repo, func(r *v1alpha1.GitRepository, original *v1alpha1.GitRepository) (any, any) {
			r.Status.Message = &msg
			r.Status.Health = v1alpha1.GitHealthFailed
			return original.Status, r.Status
		}); err != nil {
			return ctrl.Result{}, err
		}
		return ctrl.Result{
			RequeueAfter: 30 * time.Second,
		}, nil
	}
	if repo.Status.Id == nil {
		if err = utils.TryUpdateStatus[*v1alpha1.GitRepository](ctx, r.Client, repo, func(r *v1alpha1.GitRepository, original *v1alpha1.GitRepository) (any, any) {
			r.Status.Existing = true
			return original.Status, r.Status
		}); err != nil {
			return ctrl.Result{}, err
		}
	}
	if existingRepo == nil {
		if err := kubernetes.TryAddFinalizer(ctx, r.Client, repo, RepoFinalizer); err != nil {
			return ctrl.Result{}, err
		}
		resp, err := r.ConsoleClient.CreateRepository(repo.Spec.Url, cred.PrivateKey, cred.Passphrase, cred.Username, cred.Password)
		if err != nil {
			return ctrl.Result{}, err
		}
		if err = utils.TryUpdateStatus[*v1alpha1.GitRepository](ctx, r.Client, repo, func(r *v1alpha1.GitRepository, original *v1alpha1.GitRepository) (any, any) {
			r.Status.Existing = false
			return original.Status, r.Status
		}); err != nil {
			return ctrl.Result{}, err
		}
		existingRepo = resp.CreateGitRepository

	}

	if repo.Status.Sha != "" && repo.Status.Sha != sha && !repo.Status.Existing {
		_, err := r.ConsoleClient.UpdateRepository(existingRepo.ID, console.GitAttributes{
			URL:        repo.Spec.Url,
			PrivateKey: cred.PrivateKey,
			Passphrase: cred.Passphrase,
			Username:   cred.Username,
			Password:   cred.Password,
		})
		if err != nil {
			return ctrl.Result{}, err
		}
	}

	if err = utils.TryUpdateStatus[*v1alpha1.GitRepository](ctx, r.Client, repo, func(r *v1alpha1.GitRepository, original *v1alpha1.GitRepository) (any, any) {
		r.Status.Message = existingRepo.Error
		r.Status.Id = &existingRepo.ID
		if existingRepo.Health != nil {
			r.Status.Health = v1alpha1.GitHealth(*existingRepo.Health)
		}
		r.Status.Sha = sha
		return original.Status, r.Status
	}); err != nil {
		return ctrl.Result{}, err
	}

	return ctrl.Result{
		// update status
		RequeueAfter: 30 * time.Second,
	}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *Reconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.GitRepository{}).
		Complete(r)
}

func (r *Reconciler) handleDelete(ctx context.Context, repo *v1alpha1.GitRepository) (ctrl.Result, error) {

	if controllerutil.ContainsFinalizer(repo, RepoFinalizer) {
		r.Log.Info("delete git repository")
		if repo.Status.Id == nil {
			return ctrl.Result{}, fmt.Errorf("the repoository ID can not be nil")
		}
		existingRepos, err := r.getRepository(repo.Spec.Url)
		if err != nil {
			if !errors.IsNotFound(err) {
				return ctrl.Result{}, err
			}
		}
		if existingRepos != nil {
			if err := r.ConsoleClient.DeleteRepository(*repo.Status.Id); err != nil {
				if !errors.IsNotFound(err) {
					return ctrl.Result{}, err
				}
			}
		}
		if err := kubernetes.TryRemoveFinalizer(ctx, r.Client, repo, RepoFinalizer); err != nil {
			return ctrl.Result{}, err
		}
	}
	return ctrl.Result{}, nil
}

func (r *Reconciler) getRepositoryCredentials(ctx context.Context, repo *v1alpha1.GitRepository) (*GitRepoCred, error) {
	cred := &GitRepoCred{}
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
			cred.PrivateKey = &privateKey
		}
		if passphrase != "" {
			cred.Passphrase = &passphrase
		}
		if username != "" {
			cred.Username = &username
		}
		if password != "" {
			cred.Password = &password
		}
	}
	return cred, nil
}

func (r *Reconciler) getRepository(url string) (*console.GitRepositoryFragment, error) {
	existingRepos, err := r.ConsoleClient.GetRepository(&url)
	if err != nil {
		return nil, err
	}

	return existingRepos.GitRepository, nil
}
