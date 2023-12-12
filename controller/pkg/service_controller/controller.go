package servicecontroller

import (
	"context"
	"time"

	"github.com/go-logr/logr"
	console "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/console/controller/apis/deployments/v1alpha1"
	consoleclient "github.com/pluralsh/console/controller/pkg/client"
	"github.com/pluralsh/console/controller/pkg/errors"
	"github.com/pluralsh/console/controller/pkg/kubernetes"
	"github.com/pluralsh/console/controller/pkg/utils"
	"github.com/pluralsh/polly/algorithms"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

const (
	ServiceFinalizer = "deployments.plural.sh/service-protection"
	RequeueAfter     = 30 * time.Second
)

var (
	requeue = ctrl.Result{RequeueAfter: RequeueAfter}
)

// Reconciler reconciles a Service object
type Reconciler struct {
	client.Client
	ConsoleClient consoleclient.ConsoleClient
	Log           logr.Logger
	Scheme        *runtime.Scheme
}

func (r *Reconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	log := log.FromContext(ctx)
	service := &v1alpha1.ServiceDeployment{}
	if err := r.Get(ctx, req.NamespacedName, service); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	cluster := &v1alpha1.Cluster{}
	if err := r.Get(ctx, client.ObjectKey{Name: service.Spec.ClusterRef.Name, Namespace: service.Spec.ClusterRef.Namespace}, cluster); err != nil {
		return ctrl.Result{}, err
	}

	if cluster.Status.ID == nil {
		log.Info("Cluster is not ready")
		return requeue, nil
	}
	if !service.GetDeletionTimestamp().IsZero() {
		return r.handleDelete(ctx, cluster, service)
	}

	repository := &v1alpha1.GitRepository{}
	if err := r.Get(ctx, client.ObjectKey{Name: service.Spec.RepositoryRef.Name, Namespace: service.Spec.RepositoryRef.Namespace}, repository); err != nil {
		return ctrl.Result{}, err
	}
	if repository.Status.Id == nil {
		log.Info("Repository is not ready")
		return requeue, nil
	}
	if repository.Status.Health == v1alpha1.GitHealthFailed {
		log.Info("Repository is not healthy")
		return requeue, nil
	}

	attr, err := r.genServiceAttributes(ctx, service, repository.Status.Id)
	if err != nil {
		return ctrl.Result{}, err
	}

	sha, err := utils.HashObject(attr)
	if err != nil {
		return ctrl.Result{}, err
	}

	existingService, err := r.ConsoleClient.GetService(*cluster.Status.ID, service.Name)
	if err != nil && !errors.IsNotFound(err) {
		return ctrl.Result{}, err
	}
	if existingService == nil {
		if err := kubernetes.TryAddFinalizer(ctx, r.Client, service, ServiceFinalizer); err != nil {
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

	err = r.addOwnerReferences(ctx, service)
	if err != nil {
		return ctrl.Result{}, err
	}

	if service.Status.Sha != "" && service.Status.Sha != sha {
		// update service
		updater := console.ServiceUpdateAttributes{
			Version:       attr.Version,
			Protect:       attr.Protect,
			Git:           attr.Git,
			Helm:          attr.Helm,
			Configuration: attr.Configuration,
			Kustomize:     attr.Kustomize,
		}
		if err := r.ConsoleClient.UpdateService(existingService.ID, updater); err != nil {
			return ctrl.Result{}, err
		}
	}

	err = utils.TryAddOwnerRef(ctx, r.Client, cluster, service, r.Scheme)
	if err != nil {
		return ctrl.Result{}, err
	}
	err = utils.TryAddOwnerRef(ctx, r.Client, repository, service, r.Scheme)
	if err != nil {
		return ctrl.Result{}, err
	}

	if err = utils.TryUpdateStatus[*v1alpha1.ServiceDeployment](ctx, r.Client, service, func(r *v1alpha1.ServiceDeployment, original *v1alpha1.ServiceDeployment) (any, any) {
		updateStatus(r, existingService, sha)
		return original.Status, r.Status
	}); err != nil {
		return ctrl.Result{}, err
	}

	return requeue, nil
}

func updateStatus(r *v1alpha1.ServiceDeployment, existingService *console.ServiceDeploymentExtended, sha string) {
	r.Status.Id = &existingService.ID
	r.Status.Sha = sha
	if existingService.Errors != nil {
		r.Status.Errors = algorithms.Map(existingService.Errors,
			func(b *console.ErrorFragment) v1alpha1.ServiceError {
				return v1alpha1.ServiceError{
					Source:  b.Source,
					Message: b.Message,
				}
			})
	}
	r.Status.Components = make([]v1alpha1.ServiceComponent, 0)
	for _, c := range existingService.Components {
		sc := v1alpha1.ServiceComponent{
			ID:        c.ID,
			Name:      c.Name,
			Group:     c.Group,
			Kind:      c.Kind,
			Namespace: c.Namespace,
			Synced:    c.Synced,
			Version:   c.Version,
		}
		if c.State != nil {
			state := v1alpha1.ComponentState(*c.State)
			sc.State = &state
		}
		r.Status.Components = append(r.Status.Components, sc)
	}
}

// SetupWithManager sets up the controller with the Manager.
func (r *Reconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.ServiceDeployment{}).
		Complete(r)
}

func (r *Reconciler) genServiceAttributes(ctx context.Context, service *v1alpha1.ServiceDeployment, repositoryId *string) (*console.ServiceDeploymentAttributes, error) {
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
		attr.ReadBindings = algorithms.Map(service.Spec.Bindings.Read,
			func(b v1alpha1.Binding) *console.PolicyBindingAttributes { return b.Attributes() })
		attr.WriteBindings = algorithms.Map(service.Spec.Bindings.Write,
			func(b v1alpha1.Binding) *console.PolicyBindingAttributes { return b.Attributes() })
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

func (r *Reconciler) addOwnerReferences(ctx context.Context, service *v1alpha1.ServiceDeployment) error {
	if service.Spec.ConfigurationRef != nil {
		configurationSecret, err := kubernetes.GetSecret(ctx, r.Client, service.Spec.ConfigurationRef)
		if err != nil {
			return err
		}
		err = utils.TryAddOwnerRef(ctx, r.Client, service, configurationSecret, r.Scheme)
		if err != nil {
			return err
		}

	}

	if service.Spec.Helm != nil && service.Spec.Helm.ValuesRef != nil {
		configMap := &corev1.ConfigMap{}
		name := types.NamespacedName{Name: service.Spec.Helm.ValuesRef.Name, Namespace: service.Namespace}
		err := r.Get(ctx, name, configMap)
		if err != nil {
			return err
		}
		err = utils.TryAddOwnerRef(ctx, r.Client, service, configMap, r.Scheme)
		if err != nil {
			return err
		}
	}
	if service.Spec.Helm != nil && service.Spec.Helm.ChartRef != nil {
		configMap := &corev1.ConfigMap{}
		name := types.NamespacedName{Name: service.Spec.Helm.ChartRef.Name, Namespace: service.Namespace}
		err := r.Get(ctx, name, configMap)
		if err != nil {
			return err
		}
		err = utils.TryAddOwnerRef(ctx, r.Client, service, configMap, r.Scheme)
		if err != nil {
			return err
		}
	}

	return nil
}

func (r *Reconciler) handleDelete(ctx context.Context, cluster *v1alpha1.Cluster, service *v1alpha1.ServiceDeployment) (ctrl.Result, error) {
	log := log.FromContext(ctx)
	if controllerutil.ContainsFinalizer(service, ServiceFinalizer) {
		log.Info("try to delete service")
		existingService, err := r.ConsoleClient.GetService(*cluster.Status.ID, service.Name)
		if err != nil && !errors.IsNotFound(err) {
			return ctrl.Result{}, err
		}
		if existingService != nil && existingService.DeletedAt != nil {
			log.Info("waiting for the console")
			if err = utils.TryUpdateStatus[*v1alpha1.ServiceDeployment](ctx, r.Client, service, func(r *v1alpha1.ServiceDeployment, original *v1alpha1.ServiceDeployment) (any, any) {
				updateStatus(r, existingService, "")
				return original.Status, r.Status
			}); err != nil {
				return ctrl.Result{}, err
			}
			return requeue, nil
		}
		if existingService != nil {
			if err := r.ConsoleClient.DeleteService(*service.Status.Id); err != nil {
				return ctrl.Result{}, err
			}
			return requeue, nil
		}
		if err := kubernetes.TryRemoveFinalizer(ctx, r.Client, service, ServiceFinalizer); err != nil {
			return ctrl.Result{}, err
		}
	}
	return ctrl.Result{}, nil
}
