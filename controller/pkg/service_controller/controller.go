package servicecontroller

import (
	"context"
	"github.com/go-logr/logr"
	"reflect"
	"time"

	console "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/console/controller/apis/deployments/v1alpha1"
	consoleclient "github.com/pluralsh/console/controller/pkg/client"
	"github.com/pluralsh/console/controller/pkg/errors"
	"github.com/pluralsh/console/controller/pkg/kubernetes"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/util/retry"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	ctrlruntimeclient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

const (
	ServiceFinalizer = "deployments.plural.sh/service-protection"
)

// Reconciler reconciles a Service object
type Reconciler struct {
	client.Client
	ConsoleClient consoleclient.ConsoleClient
	Log           logr.Logger
}

func (r *Reconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	service := &v1alpha1.Service{}
	if err := r.Get(ctx, req.NamespacedName, service); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	if !service.GetDeletionTimestamp().IsZero() {
		return r.handleDelete(ctx, service)
	}

	cluster := &v1alpha1.Cluster{}
	if err := r.Get(ctx, client.ObjectKey{Name: service.Spec.ClusterRef.Name, Namespace: service.Spec.ClusterRef.Namespace}, cluster); err != nil {
		return ctrl.Result{}, err
	}
	if cluster.Status.ID == nil {
		r.Log.Info("Cluster is not ready", service.Spec.ClusterRef.Name)
		return ctrl.Result{
			// update status
			RequeueAfter: 30 * time.Second,
		}, nil
	}

	repository := &v1alpha1.GitRepository{}
	if err := r.Get(ctx, client.ObjectKey{Name: service.Spec.RepositoryRef.Name, Namespace: service.Spec.RepositoryRef.Namespace}, repository); err != nil {
		return ctrl.Result{}, err
	}
	if repository.Status.Id == nil {
		r.Log.Info("Repository is not ready", service.Spec.RepositoryRef.Name)
		return ctrl.Result{
			// update status
			RequeueAfter: 30 * time.Second,
		}, nil
	}
	if repository.Status.Health == v1alpha1.GitHealthFailed {
		r.Log.Info("Repository is not healthy", service.Spec.RepositoryRef.Name)
		return ctrl.Result{
			// update status
			RequeueAfter: 30 * time.Second,
		}, nil
	}

	existingService, err := r.ConsoleClient.GetService(*cluster.Status.ID, service.Name)
	if err != nil {
		if !errors.IsNotFound(err) {
			return ctrl.Result{}, err
		}
	}
	if existingService == nil {
		attr, err := r.genCreateAttr(ctx, service, repository.Status.Id)
		if err != nil {
			return ctrl.Result{}, err
		}
		_, err = r.ConsoleClient.CreateService(cluster.Status.ID, *attr)
		if err != nil {
			return ctrl.Result{}, err
		}
		existingService, err = r.ConsoleClient.GetService(*cluster.Status.ID, service.Name)
		if err != nil {
			return ctrl.Result{}, err
		}
		if err := kubernetes.TryAddFinalizer(ctx, r.Client, service, ServiceFinalizer); err != nil {
			return ctrl.Result{}, err
		}
	}
	err = r.updateReferences(ctx, service)
	if err != nil {
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
		For(&v1alpha1.Service{}).
		Complete(r)
}

func (r *Reconciler) genCreateAttr(ctx context.Context, service *v1alpha1.Service, repositoryId *string) (*console.ServiceDeploymentAttributes, error) {
	attr := &console.ServiceDeploymentAttributes{
		Name:         service.Name,
		Namespace:    service.Namespace,
		Version:      &service.Spec.Version,
		DocsPath:     service.Spec.DocsPath,
		Protect:      &service.Spec.Protect,
		RepositoryID: repositoryId,
	}
	if service.Spec.Bindings != nil {
		attr.ReadBindings = make([]*console.PolicyBindingAttributes, 0)
		attr.WriteBindings = make([]*console.PolicyBindingAttributes, 0)

		for _, r := range service.Spec.Bindings.Read {
			attr.ReadBindings = append(attr.ReadBindings, &console.PolicyBindingAttributes{
				ID:      r.ID,
				UserID:  r.UserID,
				GroupID: r.GroupID,
			})
		}
		for _, w := range service.Spec.Bindings.Write {
			attr.WriteBindings = append(attr.WriteBindings, &console.PolicyBindingAttributes{
				ID:      w.ID,
				UserID:  w.UserID,
				GroupID: w.GroupID,
			})
		}
	}

	if service.Spec.Kustomize != nil {
		attr.Kustomize = &console.KustomizeAttributes{
			Path: service.Spec.Kustomize.Path,
		}
	}
	if service.Spec.Git != nil {
		attr.Git = &console.GitRefAttributes{
			Ref:    service.Spec.Git.Ref,
			Folder: service.Spec.Git.Folder,
		}
	}
	if service.Spec.ConfigurationRef != nil {
		attr.Configuration = make([]*console.ConfigAttributes, 0)
		secret := &corev1.Secret{}
		name := types.NamespacedName{Name: service.Spec.ConfigurationRef.Name, Namespace: service.Spec.ConfigurationRef.Namespace}
		err := r.Get(ctx, name, secret)
		if err != nil {
			return nil, err
		}
		for k, v := range secret.Data {
			value := string(v)
			attr.Configuration = append(attr.Configuration, &console.ConfigAttributes{
				Name:  k,
				Value: &value,
			})
		}
	}
	if service.Spec.Helm != nil {
		attr.Helm = &console.HelmConfigAttributes{
			ValuesFiles: service.Spec.Helm.ValuesFiles,
			Version:     service.Spec.Helm.Version,
		}
		if service.Spec.Helm.Repository != nil {
			attr.Helm.Repository = &console.NamespacedName{
				Name:      service.Spec.Helm.Repository.Name,
				Namespace: service.Spec.Helm.Repository.Namespace,
			}
		}
		if service.Spec.Helm.ValuesRef != nil {
			val, err := kubernetes.GetConfigMapData(ctx, r.Client, service.Namespace, service.Spec.Helm.ValuesRef)
			if err != nil {
				return nil, err
			}
			attr.Helm.Values = &val
		}
		if service.Spec.Helm.ChartRef != nil {
			val, err := kubernetes.GetConfigMapData(ctx, r.Client, service.Namespace, service.Spec.Helm.ChartRef)
			if err != nil {
				return nil, err
			}
			attr.Helm.Chart = &val
		}

	}
	return attr, nil
}

func (r *Reconciler) updateReferences(ctx context.Context, service *v1alpha1.Service) error {
	if service.Spec.ConfigurationRef != nil {
		configurationSecret, err := kubernetes.GetSecret(ctx, r.Client, service.Spec.ConfigurationRef)
		if err != nil {
			return err
		}
		if err := kubernetes.TryAddFinalizer(ctx, r.Client, configurationSecret, ServiceFinalizer); err != nil {
			return err
		}
	}

	return nil
}

func (r *Reconciler) handleDelete(ctx context.Context, service *v1alpha1.Service) (ctrl.Result, error) {
	if controllerutil.ContainsFinalizer(service, "") {

	}
	return ctrl.Result{}, nil
}

type RepoPatchFunc func(service *v1alpha1.Service)

func UpdateServiceStatus(ctx context.Context, client ctrlruntimeclient.Client, service *v1alpha1.Service, patch RepoPatchFunc) error {
	key := ctrlruntimeclient.ObjectKeyFromObject(service)

	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		// fetch the current state of the cluster
		if err := client.Get(ctx, key, service); err != nil {
			return err
		}

		// modify it
		original := service.DeepCopy()
		patch(service)

		// save some work
		if reflect.DeepEqual(original.Status, service.Status) {
			return nil
		}

		// update the status
		return client.Status().Patch(ctx, service, ctrlruntimeclient.MergeFrom(original))
	})
}
