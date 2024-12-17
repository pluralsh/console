package controller

import (
	"context"
	goerrors "errors"
	"fmt"
	"sort"

	"github.com/pluralsh/polly/algorithms"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
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
	"sigs.k8s.io/yaml"

	console "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/cache"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/credentials"
	"github.com/pluralsh/console/go/controller/internal/errors"
	operrors "github.com/pluralsh/console/go/controller/internal/errors"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

const (
	ServiceFinalizer    = "deployments.plural.sh/service-protection"
	InventoryAnnotation = "config.k8s.io/owning-inventory"
)

// ServiceReconciler reconciles a Service object
type ServiceReconciler struct {
	client.Client
	ConsoleClient    consoleclient.ConsoleClient
	UserGroupCache   cache.UserGroupCache
	Scheme           *runtime.Scheme
	CredentialsCache credentials.NamespaceCredentialsCache
}

// +kubebuilder:rbac:groups=deployments.plural.sh,resources=servicedeployments,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=servicedeployments/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=servicedeployments/finalizers,verbs=update
// +kubebuilder:rbac:groups=core,resources=secrets,verbs=get;list;watch;patch
// +kubebuilder:rbac:groups=core,resources=configmaps,verbs=get;list;watch;patch

func (r *ServiceReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := log.FromContext(ctx)
	service := &v1alpha1.ServiceDeployment{}
	logger.Info("reconciling service deployment", "namespacedName", req.NamespacedName)
	if err := r.Get(ctx, req.NamespacedName, service); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	utils.MarkCondition(service.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
	scope, err := NewDefaultScope(ctx, r.Client, service)
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

	// Switch to namespace credentials if configured. This has to be done before sending any request to the console.
	nc, err := r.ConsoleClient.UseCredentials(req.Namespace, r.CredentialsCache)
	credentials.SyncCredentialsInfo(service, service.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	if !service.GetDeletionTimestamp().IsZero() {
		return r.handleDelete(ctx, service)
	}
	cluster := &v1alpha1.Cluster{}
	if err := r.Get(ctx, client.ObjectKey{Name: service.Spec.ClusterRef.Name, Namespace: service.Spec.ClusterRef.Namespace}, cluster); err != nil {
		utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	if cluster.Status.ID == nil {
		logger.Info("Cluster is not ready")
		utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "cluster is not ready")
		return RequeueAfter(requeueWaitForResources), nil
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
			return RequeueAfter(requeueWaitForResources), nil
		}

		if repository.Status.ID == nil {
			logger.Info("Repository is not ready")
			utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "repository is not ready")
			return RequeueAfter(requeueWaitForResources), nil
		}
		if repository.Status.Health == v1alpha1.GitHealthFailed {
			logger.Info("Repository is not healthy")
			return RequeueAfter(requeueWaitForResources), nil
		}
	}

	err = r.ensureService(service)
	if goerrors.Is(err, operrors.ErrRetriable) {
		utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return RequeueAfter(requeueWaitForResources), nil
	}

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
		_, err = r.ConsoleClient.CreateService(cluster.Status.ID, *attr)
		if err != nil {
			utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		controllerutil.AddFinalizer(service, ServiceFinalizer)
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
		SyncConfig:      attr.SyncConfig,
		Dependencies:    attr.Dependencies,
		ParentID:        attr.ParentID,
		Imports:         attr.Imports,
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

	utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	updateStatus(service, existingService, sha)

	if !isServiceReady(service.Status.Components) {
		return RequeueAfter(requeueWaitForResources), nil
	}
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

func (r *ServiceReconciler) genServiceAttributes(ctx context.Context, service *v1alpha1.ServiceDeployment, repositoryId *string) (*console.ServiceDeploymentAttributes, error) {
	syncConfigAttributes, err := service.Spec.SyncConfig.Attributes()
	if err != nil {
		return nil, err
	}

	attr := &console.ServiceDeploymentAttributes{
		Name:            service.ConsoleName(),
		Namespace:       service.ConsoleNamespace(),
		Version:         service.Spec.Version,
		DocsPath:        service.Spec.DocsPath,
		Protect:         &service.Spec.Protect,
		RepositoryID:    repositoryId,
		Git:             service.Spec.Git.Attributes(),
		ContextBindings: make([]*console.ContextBindingAttributes, 0),
		Templated:       service.Spec.TemplatedAttribute(),
		Kustomize:       service.Spec.Kustomize.Attributes(),
		Dependencies:    service.Spec.DependenciesAttribute(),
		SyncConfig:      syncConfigAttributes,
	}

	if id, ok := service.GetAnnotations()[InventoryAnnotation]; ok && id != "" {
		attr.ParentID = lo.ToPtr(id)
	}

	if len(service.Spec.Imports) > 0 {
		attr.Imports = make([]*console.ServiceImportAttributes, 0)
		for _, imp := range service.Spec.Imports {
			stackID, err := r.getStackID(ctx, imp.StackRef)
			if err != nil {
				return nil, err
			}
			if stackID == nil {
				return nil, fmt.Errorf("stack ID is missing")
			}
			attr.Imports = append(attr.Imports, &console.ServiceImportAttributes{StackID: *stackID})
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

	if len(service.Spec.Configuration) > 0 {
		if attr.Configuration == nil {
			attr.Configuration = make([]*console.ConfigAttributes, 0)
		}

		for k, v := range service.Spec.Configuration {
			value := v
			attr.Configuration = append(attr.Configuration, &console.ConfigAttributes{
				Name:  k,
				Value: lo.ToPtr(value),
			})
		}
	}

	for _, contextName := range service.Spec.Contexts {
		sc, err := r.ConsoleClient.GetServiceContext(contextName)
		if err != nil {
			return nil, err
		}
		attr.ContextBindings = append(attr.ContextBindings, &console.ContextBindingAttributes{ContextID: sc.ID})
	}

	if service.Spec.Bindings != nil {
		attr.ReadBindings = policyBindings(service.Spec.Bindings.Read)
		attr.WriteBindings = policyBindings(service.Spec.Bindings.Write)
	}

	if service.Spec.Helm != nil {
		attr.Helm = &console.HelmConfigAttributes{
			Release:     service.Spec.Helm.Release,
			ValuesFiles: service.Spec.Helm.ValuesFiles,
			Version:     service.Spec.Helm.Version,
			Chart:       service.Spec.Helm.Chart,
			URL:         service.Spec.Helm.URL,
			IgnoreHooks: service.Spec.Helm.IgnoreHooks,
		}
		if service.Spec.Helm.Repository != nil {
			attr.Helm.Repository = &console.NamespacedName{
				Name:      service.Spec.Helm.Repository.Name,
				Namespace: service.Spec.Helm.Repository.Namespace,
			}
		}

		if service.Spec.RepositoryRef != nil {
			ref := service.Spec.RepositoryRef
			var repo v1alpha1.GitRepository
			if err := r.Get(ctx, client.ObjectKey{Name: ref.Name, Namespace: ref.Namespace}, &repo); err != nil {
				return nil, err
			}

			if repo.Status.ID == nil {
				return nil, fmt.Errorf("GitRepository %s/%s is not yet ready", ref.Namespace, ref.Name)
			}

			attr.Helm.RepositoryID = repo.Status.ID
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
	}

	return attr, nil
}

func (r *ServiceReconciler) getStackID(ctx context.Context, obj corev1.ObjectReference) (*string, error) {
	stack := &v1alpha1.InfrastructureStack{}
	if err := r.Get(ctx, client.ObjectKey{Name: obj.Name, Namespace: obj.Namespace}, stack); err != nil {
		return nil, err
	}
	if !stack.Status.HasID() {
		return nil, fmt.Errorf("stack is not ready yet")
	}
	return stack.Status.ID, nil
}

func (r *ServiceReconciler) MergeHelmValues(ctx context.Context, secretRef *corev1.SecretReference, values *runtime.RawExtension) (*string, error) {
	valuesFromMap := map[string]interface{}{}
	valuesMap := map[string]interface{}{}

	if secretRef != nil {
		valuesFromSecret, err := utils.GetSecret(ctx, r.Client, secretRef)
		if err != nil {
			return nil, err
		}

		for _, vals := range valuesFromSecret.Data {
			current := map[string]interface{}{}
			if err := yaml.Unmarshal(vals, &current); err != nil {
				continue
			}
			valuesFromMap = algorithms.Merge(valuesFromMap, current)
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
		if err := utils.TryAddOwnerRef(ctx, r.Client, service, configurationSecret, r.Scheme); err != nil {
			return err
		}
	}

	if service.Spec.Helm != nil && service.Spec.Helm.ValuesFrom != nil {
		valuesSecret, err := utils.GetSecret(ctx, r.Client, service.Spec.Helm.ValuesFrom)
		if err != nil {
			return err
		}
		if err := utils.TryAddOwnerRef(ctx, r.Client, service, valuesSecret, r.Scheme); err != nil {
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
		err = utils.TryAddOwnerRef(ctx, r.Client, service, configMap, r.Scheme)
		if err != nil {
			return err
		}
	}

	if len(service.Spec.Imports) > 0 {
		for _, imp := range service.Spec.Imports {
			stack := &v1alpha1.InfrastructureStack{}
			name := types.NamespacedName{Name: imp.StackRef.Name, Namespace: imp.StackRef.Namespace}
			err := r.Get(ctx, name, stack)
			if err != nil {
				return err
			}
			err = utils.TryAddOwnerRef(ctx, r.Client, service, stack, r.Scheme)
			if err != nil {
				return err
			}
		}
	}

	return nil
}

func (r *ServiceReconciler) handleDelete(ctx context.Context, service *v1alpha1.ServiceDeployment) (ctrl.Result, error) {
	log := log.FromContext(ctx)
	if controllerutil.ContainsFinalizer(service, ServiceFinalizer) {
		log.Info("try to delete service")
		cluster := &v1alpha1.Cluster{}
		if err := r.Get(ctx, client.ObjectKey{Name: service.Spec.ClusterRef.Name, Namespace: service.Spec.ClusterRef.Namespace}, cluster); err != nil {
			if !apierrors.IsNotFound(err) {
				utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return ctrl.Result{}, err
			}
		}
		if cluster.Status.ID == nil {
			err := r.deleteService(service)
			if errors.IsNotFound(err) || err == nil {
				controllerutil.RemoveFinalizer(service, ServiceFinalizer)
				return ctrl.Result{}, nil
			}
			utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}

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
		if existingService != nil {
			if err := r.deleteService(service); err != nil {
				utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return ctrl.Result{}, err
			}
			return requeue, nil
		}
		controllerutil.RemoveFinalizer(service, ServiceFinalizer)
	}
	return ctrl.Result{}, nil
}

func (r *ServiceReconciler) deleteService(service *v1alpha1.ServiceDeployment) error {
	if service.Status.ID != nil {
		if service.Spec.Detach {
			return r.ConsoleClient.DetachService(*service.Status.ID)
		}
		return r.ConsoleClient.DeleteService(*service.Status.ID)
	}
	return nil
}

// ensureService makes sure that user-friendly input such as userEmail/groupName in
// bindings are transformed into valid IDs on the v1alpha1.Binding object before creation
func (r *ServiceReconciler) ensureService(service *v1alpha1.ServiceDeployment) error {
	if service.Spec.Bindings == nil {
		return nil
	}

	bindings, req, err := ensureBindings(service.Spec.Bindings.Read, r.UserGroupCache)
	if err != nil {
		return err
	}
	service.Spec.Bindings.Read = bindings

	bindings, req2, err := ensureBindings(service.Spec.Bindings.Write, r.UserGroupCache)
	if err != nil {
		return err
	}
	service.Spec.Bindings.Write = bindings

	if req || req2 {
		return operrors.ErrRetriable
	}

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
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).                                                               // Requirement for credentials implementation.
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(r.Client, new(v1alpha1.ServiceDeploymentList))). // Reconcile objects on credentials change.
		For(&v1alpha1.ServiceDeployment{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Owns(&corev1.Secret{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})).
		Owns(&corev1.ConfigMap{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})).
		Owns(&v1alpha1.InfrastructureStack{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})).
		Complete(r)
}
