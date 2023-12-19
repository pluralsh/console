package controller

import (
	"context"
	"encoding/json"
	"sort"

	console "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/polly/algorithms"
	corev1 "k8s.io/api/core/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"github.com/pluralsh/console/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/controller/internal/client"
	"github.com/pluralsh/console/controller/internal/errors"
	"github.com/pluralsh/console/controller/internal/utils"
)

const (
	ServiceFinalizer = "deployments.plural.sh/service-protection"
)

// ServiceReconciler reconciles a Service object
type ServiceReconciler struct {
	client.Client
	ConsoleClient consoleclient.ConsoleClient
	Scheme        *runtime.Scheme
}

// +kubebuilder:rbac:groups=deployments.plural.sh,resources=servicedeployments,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=servicedeployments/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=servicedeployments/finalizers,verbs=update
// +kubebuilder:rbac:groups=core,resources=secrets,verbs=get;list
// +kubebuilder:rbac:groups=core,resources=configmaps,verbs=get;list

func (r *ServiceReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := log.FromContext(ctx)
	service := &v1alpha1.ServiceDeployment{}
	if err := r.Get(ctx, req.NamespacedName, service); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	scope, err := NewServiceScope(ctx, r.Client, service)
	if err != nil {
		logger.Error(err, "failed to create scope")
		utils.MarkCondition(service.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}
	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	cluster := &v1alpha1.Cluster{}
	if err := r.Get(ctx, client.ObjectKey{Name: service.Spec.ClusterRef.Name, Namespace: service.Spec.ClusterRef.Namespace}, cluster); err != nil {
		utils.MarkCondition(service.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	if cluster.Status.ID == nil {
		logger.Info("Cluster is not ready")
		utils.MarkCondition(service.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "cluster is not ready")
		return requeue, nil
	}
	if !service.GetDeletionTimestamp().IsZero() {
		return r.handleDelete(ctx, cluster, service)
	}

	repository := &v1alpha1.GitRepository{}
	if err := r.Get(ctx, client.ObjectKey{Name: service.Spec.RepositoryRef.Name, Namespace: service.Spec.RepositoryRef.Namespace}, repository); err != nil {
		utils.MarkCondition(service.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}
	if !repository.DeletionTimestamp.IsZero() {
		logger.Info("deleting service after repository deletion")
		if err := r.Delete(ctx, service); err != nil {
			utils.MarkCondition(service.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
			return ctrl.Result{}, err
		}
		return requeue, nil
	}

	if repository.Status.ID == nil {
		logger.Info("Repository is not ready")
		utils.MarkCondition(service.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "repository is not ready")
		return requeue, nil
	}
	if repository.Status.Health == v1alpha1.GitHealthFailed {
		logger.Info("Repository is not healthy")
		return requeue, nil
	}

	attr, err := r.genServiceAttributes(ctx, service, repository.Status.ID)
	if err != nil {
		utils.MarkCondition(service.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	existingService, err := r.ConsoleClient.GetService(*cluster.Status.ID, service.Name)
	if err != nil && !errors.IsNotFound(err) {
		utils.MarkCondition(service.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}
	if existingService == nil {
		controllerutil.AddFinalizer(service, ServiceFinalizer)
		_, err = r.ConsoleClient.CreateService(cluster.Status.ID, *attr)
		if err != nil {
			utils.MarkCondition(service.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
			return ctrl.Result{}, err
		}
		existingService, err = r.ConsoleClient.GetService(*cluster.Status.ID, service.Name)
		if err != nil {
			utils.MarkCondition(service.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
			return ctrl.Result{}, err
		}
	}
	err = r.addOwnerReferences(ctx, service)
	if err != nil {
		utils.MarkCondition(service.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}
	sort.Slice(attr.Configuration, func(i, j int) bool {
		return attr.Configuration[i].Name < attr.Configuration[j].Name
	})
	updater := console.ServiceUpdateAttributes{
		Version:       attr.Version,
		Protect:       attr.Protect,
		Git:           attr.Git,
		Helm:          attr.Helm,
		Configuration: attr.Configuration,
		Kustomize:     attr.Kustomize,
	}

	sha, err := utils.HashObject(updater)
	if err != nil {
		utils.MarkCondition(service.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	if service.Status.HasSHA() && !service.Status.IsSHAEqual(sha) {
		// update service
		if err := r.ConsoleClient.UpdateService(existingService.ID, updater); err != nil {
			utils.MarkCondition(service.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
			return ctrl.Result{}, err
		}
	}
	if err := controllerutil.SetOwnerReference(cluster, service, r.Scheme); err != nil {
		utils.MarkCondition(service.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}
	if err = controllerutil.SetOwnerReference(cluster, service, r.Scheme); err != nil {
		utils.MarkCondition(service.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	updateStatus(service, existingService, sha)
	utils.MarkCondition(service.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return requeue, nil
}

func updateStatus(r *v1alpha1.ServiceDeployment, existingService *console.ServiceDeploymentExtended, sha string) {
	r.Status.ID = &existingService.ID
	r.Status.SHA = &sha
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
func (r *ServiceReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.ServiceDeployment{}).
		Owns(&corev1.Secret{}).
		Owns(&corev1.ConfigMap{}).
		Complete(r)
}

func (r *ServiceReconciler) genServiceAttributes(ctx context.Context, service *v1alpha1.ServiceDeployment, repositoryId *string) (*console.ServiceDeploymentAttributes, error) {
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
			val, err := utils.GetConfigMapData(ctx, r.Client, service.Namespace, service.Spec.Helm.ValuesRef)
			if err != nil {
				return nil, err
			}
			attr.Helm.Values = &val
		}
		if service.Spec.Helm.ChartRef != nil {
			val, err := utils.GetConfigMapData(ctx, r.Client, service.Namespace, service.Spec.Helm.ChartRef)
			if err != nil {
				return nil, err
			}
			attr.Helm.Chart = &val
		}
	}
	if service.Spec.SyncConfig != nil {
		var annotations *string
		var labels *string
		if service.Spec.SyncConfig.Annotations != nil {
			result, err := json.Marshal(service.Spec.SyncConfig.Annotations)
			if err != nil {
				return nil, err
			}
			rawAnnotations := string(result)
			annotations = &rawAnnotations
		}
		if service.Spec.SyncConfig.Labels != nil {
			result, err := json.Marshal(service.Spec.SyncConfig.Labels)
			if err != nil {
				return nil, err
			}
			rawLabels := string(result)
			labels = &rawLabels
		}
		attr.SyncConfig = &console.SyncConfigAttributes{
			NamespaceMetadata: &console.MetadataAttributes{
				Labels:      labels,
				Annotations: annotations,
			},
		}
	}

	return attr, nil
}

func (r *ServiceReconciler) addOwnerReferences(ctx context.Context, service *v1alpha1.ServiceDeployment) error {
	if service.Spec.ConfigurationRef != nil {
		configurationSecret, err := utils.GetSecret(ctx, r.Client, service.Spec.ConfigurationRef)
		if err != nil {
			return err
		}
		if err := utils.TryAddControllerRef(ctx, r.Client, service, configurationSecret, r.Scheme); err != nil {
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
		err = utils.TryAddControllerRef(ctx, r.Client, service, configMap, r.Scheme)
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
		err = utils.TryAddControllerRef(ctx, r.Client, service, configMap, r.Scheme)
		if err != nil {
			return err
		}
	}

	return nil
}

func (r *ServiceReconciler) handleDelete(ctx context.Context, cluster *v1alpha1.Cluster, service *v1alpha1.ServiceDeployment) (ctrl.Result, error) {
	log := log.FromContext(ctx)
	if controllerutil.ContainsFinalizer(service, ServiceFinalizer) {
		log.Info("try to delete service")
		existingService, err := r.ConsoleClient.GetService(*cluster.Status.ID, service.Name)
		if err != nil && !errors.IsNotFound(err) {
			utils.MarkCondition(service.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
			return ctrl.Result{}, err
		}
		if existingService != nil && existingService.DeletedAt != nil {
			log.Info("waiting for the console")
			updateStatus(service, existingService, "")
			return requeue, nil
		}
		if existingService != nil {
			if err := r.ConsoleClient.DeleteService(*service.Status.ID); err != nil {
				utils.MarkCondition(service.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
				return ctrl.Result{}, err
			}
			return requeue, nil
		}
		controllerutil.RemoveFinalizer(service, ServiceFinalizer)
	}
	return ctrl.Result{}, nil
}
