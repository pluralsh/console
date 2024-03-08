package controller

import (
	"context"
	"encoding/json"
	"sort"

	console "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/console/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/controller/internal/client"
	"github.com/pluralsh/console/controller/internal/errors"
	"github.com/pluralsh/console/controller/internal/utils"
	"github.com/pluralsh/polly/algorithms"
	"github.com/samber/lo"
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
	"sigs.k8s.io/yaml"
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
// +kubebuilder:rbac:groups=core,resources=secrets,verbs=get;list;watch;patch
// +kubebuilder:rbac:groups=core,resources=configmaps,verbs=get;list;watch;patch

func (r *ServiceReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := log.FromContext(ctx)
	service := &v1alpha1.ServiceDeployment{}
	if err := r.Get(ctx, req.NamespacedName, service); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	scope, err := NewServiceScope(ctx, r.Client, service)
	if err != nil {
		logger.Error(err, "failed to create scope")
		utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
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
		utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	if cluster.Status.ID == nil {
		logger.Info("Cluster is not ready")
		utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "cluster is not ready")
		return requeue, nil
	}
	if !service.GetDeletionTimestamp().IsZero() {
		return r.handleDelete(ctx, cluster, service)
	}

	for _, dep := range service.Spec.Dependencies {
		serviceDep := &v1alpha1.ServiceDeployment{}
		if err := r.Get(ctx, client.ObjectKey{Name: dep.Name, Namespace: dep.Namespace}, serviceDep); err != nil {
			return ctrl.Result{}, err
		}

		if !isServiceReady(serviceDep.Status.Components) {
			return requeue, nil
		}
	}

	repository := &v1alpha1.GitRepository{}
	if service.Spec.RepositoryRef != nil {
		if err := r.Get(ctx, client.ObjectKey{Name: service.Spec.RepositoryRef.Name, Namespace: service.Spec.RepositoryRef.Namespace}, repository); err != nil {
			utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		if !repository.DeletionTimestamp.IsZero() {
			logger.Info("deleting service after repository deletion")
			if err := r.Delete(ctx, service); err != nil {
				utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return ctrl.Result{}, err
			}
			return requeue, nil
		}

		if repository.Status.ID == nil {
			logger.Info("Repository is not ready")
			utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "repository is not ready")
			return requeue, nil
		}
		if repository.Status.Health == v1alpha1.GitHealthFailed {
			logger.Info("Repository is not healthy")
			return requeue, nil
		}
	}

	err = r.ensureService(service)
	if err != nil {
		utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	attr, err := r.genServiceAttributes(ctx, service, repository.Status.ID)
	if err != nil {
		utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	existingService, err := r.ConsoleClient.GetService(*cluster.Status.ID, service.ConsoleName())
	if err != nil && !errors.IsNotFound(err) {
		utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if existingService == nil {
		controllerutil.AddFinalizer(service, ServiceFinalizer)
		_, err = r.ConsoleClient.CreateService(cluster.Status.ID, *attr)
		if err != nil {
			utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		existingService, err = r.ConsoleClient.GetService(*cluster.Status.ID, service.ConsoleName())
		if err != nil {
			utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
	}
	err = r.addOwnerReferences(ctx, service)
	if err != nil {
		utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	sort.Slice(attr.Configuration, func(i, j int) bool {
		return attr.Configuration[i].Name < attr.Configuration[j].Name
	})
	updater := console.ServiceUpdateAttributes{
		Version:         attr.Version,
		Protect:         attr.Protect,
		Git:             attr.Git,
		Helm:            attr.Helm,
		Configuration:   attr.Configuration,
		Kustomize:       attr.Kustomize,
		ReadBindings:    attr.ReadBindings,
		WriteBindings:   attr.WriteBindings,
		ContextBindings: attr.ContextBindings,
		Templated:       attr.Templated,
	}

	sha, err := utils.HashObject(updater)
	if err != nil {
		utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	if service.Status.HasSHA() && !service.Status.IsSHAEqual(sha) {
		logger.Info("updating ServiceDeployment")
		// update service
		if err := r.ConsoleClient.UpdateService(existingService.ID, updater); err != nil {
			utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, err.Error())
			return ctrl.Result{}, err
		}
	}

	// we shouldn't set these as it'll hit cross-namespace ownership issues
	// if err := controllerutil.SetOwnerReference(cluster, service, r.Scheme); err != nil {
	// 	utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, err.Error())
	// 	return ctrl.Result{}, err
	// }
	// if err = controllerutil.SetOwnerReference(cluster, service, r.Scheme); err != nil {
	// 	utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, err.Error())
	// 	return ctrl.Result{}, err
	// }

	updateStatus(service, existingService, sha)

	utils.MarkCondition(service.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "The service components are not ready yet")
	if isServiceReady(service.Status.Components) {
		utils.MarkCondition(service.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	}

	utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

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

func (r *ServiceReconciler) genServiceAttributes(ctx context.Context, service *v1alpha1.ServiceDeployment, repositoryId *string) (*console.ServiceDeploymentAttributes, error) {
	attr := &console.ServiceDeploymentAttributes{
		Name:            service.ConsoleName(),
		Namespace:       service.ConsoleNamespace(),
		Version:         service.Spec.Version,
		DocsPath:        service.Spec.DocsPath,
		Protect:         &service.Spec.Protect,
		RepositoryID:    repositoryId,
		ContextBindings: make([]*console.ContextBindingAttributes, 0),
		Templated:       lo.ToPtr(true),
	}

	if service.Spec.Templated != nil {
		attr.Templated = service.Spec.Templated
	}

	for _, contextName := range service.Spec.Contexts {
		sc, err := r.ConsoleClient.GetServiceContext(contextName)
		if err != nil {
			return nil, err
		}
		attr.ContextBindings = append(attr.ContextBindings, &console.ContextBindingAttributes{ContextID: sc.ID})
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
		if service.Spec.Helm.ValuesConfigMapRef != nil {
			val, err := utils.GetConfigMapData(ctx, r.Client, service.GetNamespace(), service.Spec.Helm.ValuesConfigMapRef)
			if err != nil {
				return nil, err
			}
			attr.Helm.Values = &val
		}

		if service.Spec.Helm.ValuesFrom != nil || service.Spec.Helm.Values != nil {
			values, err := r.MergeHelmValues(ctx, service.Spec.Helm.ValuesFrom, service.Spec.Helm.Values)
			if err != nil {
				return nil, err
			}
			attr.Helm.Values = values
		}

		if service.Spec.Helm.Chart != nil {
			attr.Helm.Chart = service.Spec.Helm.Chart
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

func (r *ServiceReconciler) MergeHelmValues(ctx context.Context, secretRef *corev1.SecretReference, values *runtime.RawExtension) (*string, error) {
	valuesFromMap := map[string]interface{}{}
	valuesMap := map[string]interface{}{}

	if secretRef != nil {
		valuesFromSecret, err := utils.GetSecret(ctx, r.Client, secretRef)
		if err != nil {
			return nil, err
		}

		// TODO: allow users to specify this key in another CRD field.
		if vals, ok := valuesFromSecret.Data["values.yaml"]; ok {
			if err := yaml.Unmarshal(vals, &valuesFromMap); err != nil {
				return nil, err
			}
		}
	}

	if values != nil {
		if err := yaml.Unmarshal(values.Raw, &valuesMap); err != nil {
			return nil, err
		}
	}

	result := algorithms.Merge(valuesMap, valuesFromMap)
	out, err := yaml.Marshal(result)
	if err != nil {
		return nil, err
	}
	return lo.ToPtr(string(out)), nil
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

	if service.Spec.Helm != nil && service.Spec.Helm.ValuesConfigMapRef != nil {
		configMap := &corev1.ConfigMap{}
		name := types.NamespacedName{Name: service.Spec.Helm.ValuesConfigMapRef.Name, Namespace: service.GetNamespace()}
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
		existingService, err := r.ConsoleClient.GetService(*cluster.Status.ID, service.ConsoleName())
		if err != nil && !errors.IsNotFound(err) {
			utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		if existingService != nil && existingService.DeletedAt != nil {
			log.Info("waiting for the console")
			updateStatus(service, existingService, "")
			return requeue, nil
		}
		if existingService != nil && service.Status.ID != nil {
			if err := r.ConsoleClient.DeleteService(*service.Status.ID); err != nil {
				utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return ctrl.Result{}, err
			}
			return requeue, nil
		}
		controllerutil.RemoveFinalizer(service, ServiceFinalizer)
	}
	return ctrl.Result{}, nil
}

// ensureService makes sure that user-friendly input such as userEmail/groupName in
// bindings are transformed into valid IDs on the v1alpha1.Binding object before creation
func (r *ServiceReconciler) ensureService(service *v1alpha1.ServiceDeployment) error {
	if service.Spec.Bindings == nil {
		return nil
	}

	bindings, err := ensureBindings(service.Spec.Bindings.Read, r.ConsoleClient)
	if err != nil {
		return err
	}
	service.Spec.Bindings.Read = bindings

	bindings, err = ensureBindings(service.Spec.Bindings.Write, r.ConsoleClient)
	if err != nil {
		return err
	}
	service.Spec.Bindings.Write = bindings

	return nil
}

func isServiceReady(components []v1alpha1.ServiceComponent) bool {
	if len(components) == 0 {
		return false
	}

	for _, c := range components {
		if !c.Synced {
			return false
		}
		if c.State != nil && *c.State != v1alpha1.ComponentStateRunning {
			return false
		}
	}

	return true
}

// SetupWithManager sets up the controller with the Manager.
func (r *ServiceReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.ServiceDeployment{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Owns(&corev1.Secret{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})).
		Owns(&corev1.ConfigMap{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})).
		Complete(r)
}
