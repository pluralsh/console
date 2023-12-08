package gitrepositorycontroller

import (
	"context"
	"fmt"
	"reflect"
	"time"

	console "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/console/controller/apis/deployments/v1alpha1"
	consoleclient "github.com/pluralsh/console/controller/pkg/client"
	"github.com/pluralsh/console/controller/pkg/errors"
	"github.com/pluralsh/console/controller/pkg/kubernetes"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/util/retry"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	ctrlruntimeclient "sigs.k8s.io/controller-runtime/pkg/client"
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
	Log           *zap.SugaredLogger
}

func (r *Reconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
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

	existingRepos, err := r.getRepository(repo.Spec.Url)
	if err != nil {
		if !errors.IsNotFound(err) {
			return ctrl.Result{}, err
		}
	}
	if existingRepos == nil {
		cred, err := r.getRepositoryCredentials(ctx, repo)
		if err != nil {
			return ctrl.Result{}, err
		}
		resp, err := r.ConsoleClient.CreateRepository(repo.Spec.Url, cred.PrivateKey, cred.Passphrase, cred.Username, cred.Password)
		if err != nil {
			return ctrl.Result{}, err
		}
		existingRepos = resp.CreateGitRepository
	}
	if err := kubernetes.TryAddFinalizer(ctx, r.Client, repo, RepoFinalizer); err != nil {
		return ctrl.Result{}, err
	}

	if err := UpdateReposStatus(ctx, r.Client, repo, func(r *v1alpha1.GitRepository) {
		r.Status.Message = existingRepos.Error
		r.Status.Id = &existingRepos.ID
		if existingRepos.Health != nil {
			r.Status.Health = (*string)(existingRepos.Health)
		}

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
	if repo.Spec.CredentialsRef != nil {
		secret := &corev1.Secret{}
		name := types.NamespacedName{Name: repo.Spec.CredentialsRef.Name, Namespace: repo.Spec.CredentialsRef.Namespace}
		err := r.Get(ctx, name, secret)
		if err != nil {
			if !apierrors.IsNotFound(err) {
				return ctrl.Result{}, err
			}
		}
		if secret.Name != "" {
			if controllerutil.ContainsFinalizer(secret, RepoFinalizer) {
				r.Log.Info("delete credential secret")
				err := kubernetes.DeleteSecret(ctx, r.Client, repo.Spec.CredentialsRef.Namespace, repo.Spec.CredentialsRef.Name)
				if err != nil {
					return ctrl.Result{}, err
				}
				if err := kubernetes.TryRemoveFinalizer(ctx, r.Client, secret, RepoFinalizer); err != nil {
					return ctrl.Result{}, err
				}
			}
		}
	}

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

		if err := kubernetes.TryAddFinalizer(ctx, r.Client, secret, RepoFinalizer); err != nil {
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

type RepoPatchFunc func(repo *v1alpha1.GitRepository)

func UpdateReposStatus(ctx context.Context, client ctrlruntimeclient.Client, bootstrap *v1alpha1.GitRepository, patch RepoPatchFunc) error {
	key := ctrlruntimeclient.ObjectKeyFromObject(bootstrap)

	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		// fetch the current state of the cluster
		if err := client.Get(ctx, key, bootstrap); err != nil {
			return err
		}

		// modify it
		original := bootstrap.DeepCopy()
		patch(bootstrap)

		// save some work
		if reflect.DeepEqual(original.Status, bootstrap.Status) {
			return nil
		}

		// update the status
		return client.Status().Patch(ctx, bootstrap, ctrlruntimeclient.MergeFrom(original))
	})
}
