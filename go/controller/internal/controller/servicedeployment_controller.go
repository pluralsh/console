package controller

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/pluralsh/polly/algorithms"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
	"sigs.k8s.io/yaml"

	console "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/cache"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/credentials"
	"github.com/pluralsh/console/go/controller/internal/errors"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

const (
	ServiceFinalizer       = "deployments.plural.sh/service-protection"
	InventoryAnnotation    = "config.k8s.io/owning-inventory"
	ServiceOwnerAnnotation = "deployments.plural.sh/service-owner"
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

	// Handle resource deletion both in Kubernetes cluster and in Console API.
	if result := r.addOrRemoveFinalizer(service); result != nil {
		return *result, nil
	}

	cluster := &v1alpha1.Cluster{}
	if err := r.Get(ctx, client.ObjectKey{Name: service.Spec.ClusterRef.Name, Namespace: service.Spec.ClusterRef.Namespace}, cluster); err != nil {
		return handleRequeue(nil, err, service.SetCondition)
	}

	if !cluster.Status.HasID() {
		utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "cluster is not ready")
		return waitForResources, nil
	}

	repository := &v1alpha1.GitRepository{}
	if service.Spec.RepositoryRef != nil {
		if err := r.Get(ctx, client.ObjectKey{Name: service.Spec.RepositoryRef.Name, Namespace: service.Spec.RepositoryRef.Namespace}, repository); err != nil {
			return handleRequeue(nil, err, service.SetCondition)
		}
		if !repository.DeletionTimestamp.IsZero() {
			logger.Info("deleting service after repository deletion")
			if err := r.Delete(ctx, service); err != nil {
				utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return ctrl.Result{}, err
			}
			return waitForResources, nil
		}

		if !repository.Status.HasID() {
			utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "repository is not ready")
			return waitForResources, nil
		}
		if repository.Status.Health == v1alpha1.GitHealthFailed {
			utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "repository is not healthy")
			return waitForResources, nil
		}
	}

	if err = r.ensureService(service); err != nil {
		return handleRequeue(nil, err, service.SetCondition)
	}

	attr, result, err := r.genServiceAttributes(ctx, service, repository.Status.ID)
	if result != nil || err != nil {
		return handleRequeue(result, err, service.SetCondition)
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
		FlowID:          attr.FlowID,
		Sources:         attr.Sources,
		Renderers:       attr.Renderers,
	}

	sha, err := utils.HashObject(updater)
	if err != nil {
		utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	if service.Status.HasSHA() && !service.Status.IsSHAEqual(sha) {
		if err := r.ConsoleClient.UpdateService(existingService.ID, updater); err != nil {
			utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, err.Error())
			return ctrl.Result{}, err
		}
	}

	utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	updateStatus(service, existingService, sha)

	if !isServiceReady(service.Status.Components) {
		return waitForResources, nil
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

func (r *ServiceReconciler) genServiceAttributes(ctx context.Context, service *v1alpha1.ServiceDeployment, repositoryId *string) (*console.ServiceDeploymentAttributes, *ctrl.Result, error) {
	syncConfigAttributes, err := service.Spec.SyncConfig.Attributes()
	if err != nil {
		return nil, nil, err
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
				return nil, &requeue, fmt.Errorf("error while getting stack ID: %s", imp.StackRef.Name)
			}
			attr.Imports = append(attr.Imports, &console.ServiceImportAttributes{StackID: *stackID})
		}
	}

	if service.Spec.FlowRef != nil {
		flow := &v1alpha1.Flow{}
		ns := service.Spec.FlowRef.Namespace
		if ns == "" {
			ns = service.Namespace
		}
		nsn := types.NamespacedName{Name: service.Spec.FlowRef.Name, Namespace: ns}
		if err = r.Get(ctx, nsn, flow); err != nil {
			return nil, &requeue, fmt.Errorf("error while getting flow: %s", err.Error())
		}
		if !flow.Status.HasID() {
			return nil, &waitForResources, fmt.Errorf("flow is not ready")
		}
		attr.FlowID = flow.Status.ID
	}

	configuration, hasConfig, err := r.svcConfiguration(ctx, service)
	if err != nil {
		return nil, &requeue, err
	}

	// we only want to explicitly set the configuration field in attr if the user specified it via
	// the CR spec.
	if hasConfig {
		attr.Configuration = configuration
	}

	for _, contextName := range service.Spec.Contexts {
		sc, err := r.ConsoleClient.GetServiceContext(contextName)
		if err != nil {
			return nil, nil, err
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
			IgnoreCrds:  service.Spec.Helm.IgnoreCrds,
			LuaScript:   service.Spec.Helm.LuaScript,
			LuaFile:     service.Spec.Helm.LuaFile,
			Git:         service.Spec.Helm.Git.Attributes(),
		}
		if service.Spec.Helm.Repository != nil {
			attr.Helm.Repository = &console.NamespacedName{
				Name:      service.Spec.Helm.Repository.Name,
				Namespace: service.Spec.Helm.Repository.Namespace,
			}
		}

		if service.Spec.Helm.RepositoryRef != nil {
			ref := service.Spec.Helm.RepositoryRef
			var repo v1alpha1.GitRepository
			if err = r.Get(ctx, client.ObjectKey{Name: ref.Name, Namespace: ref.Namespace}, &repo); err != nil {
				return nil, &requeue, fmt.Errorf("error while getting repository: %s", err.Error())
			}

			if !repo.Status.HasID() {
				return nil, &waitForResources, fmt.Errorf("repository is not ready")
			}

			attr.Helm.RepositoryID = repo.Status.ID
		}

		if service.Spec.Helm.ValuesConfigMapRef != nil {
			val, err := utils.GetConfigMapData(ctx, r.Client, service.GetNamespace(), service.Spec.Helm.ValuesConfigMapRef)
			if err != nil {
				return nil, &requeue, fmt.Errorf("error while getting values config map: %s", err.Error())
			}
			attr.Helm.Values = &val
		}

		if service.Spec.Helm.ValuesFrom != nil || service.Spec.Helm.Values != nil {
			values, err := r.MergeHelmValues(ctx, service.Spec.Helm.ValuesFrom, service.Spec.Helm.Values)
			if err != nil {
				return nil, nil, err
			}
			attr.Helm.Values = values
		}
	}

	if err := r.setSources(ctx, service, attr); err != nil {
		return nil, nil, err
	}
	setRenderers(service, attr)

	return attr, nil, nil
}

func (r *ServiceReconciler) setSources(ctx context.Context, service *v1alpha1.ServiceDeployment, attr *console.ServiceDeploymentAttributes) error {
	if len(service.Spec.Sources) > 0 {
		attr.Sources = make([]*console.ServiceSourceAttributes, 0)
		for _, source := range service.Spec.Sources {
			newSource := &console.ServiceSourceAttributes{
				Path: source.Path,
			}
			if source.Git != nil {
				newSource.Git = &console.GitRefAttributes{
					Ref:    source.Git.Ref,
					Folder: source.Git.Folder,
					Files:  source.Git.Files,
				}
			}
			repositoryID, err := r.getRepository(ctx, source.RepositoryRef)
			if err != nil {
				return err
			}
			newSource.RepositoryID = repositoryID
			attr.Sources = append(attr.Sources, newSource)
		}
	}
	return nil
}

func setRenderers(service *v1alpha1.ServiceDeployment, attr *console.ServiceDeploymentAttributes) {
	if len(service.Spec.Renderers) > 0 {
		attr.Renderers = make([]*console.RendererAttributes, 0)
		for _, renderer := range service.Spec.Renderers {
			newRenderer := &console.RendererAttributes{
				Path: renderer.Path,
				Type: renderer.Type,
			}
			if renderer.Helm != nil {
				newRenderer.Helm = &console.HelmMinimalAttributes{
					Values:      renderer.Helm.Values,
					ValuesFiles: lo.ToSlicePtr(renderer.Helm.ValuesFiles),
					Release:     renderer.Helm.Release,
				}
			}
			attr.Renderers = append(attr.Renderers, newRenderer)
		}
	}
}

func (r *ServiceReconciler) getRepository(ctx context.Context, ref *corev1.ObjectReference) (*string, error) {
	var repositoryID *string
	if ref != nil {
		repository := &v1alpha1.GitRepository{}
		if err := r.Get(ctx, client.ObjectKey{Name: ref.Name, Namespace: ref.Namespace}, repository); err != nil {
			return nil, err
		}
		if !repository.Status.HasID() {
			return nil, fmt.Errorf("repository %s is not ready", repository.Name)
		}
		if repository.Status.Health == v1alpha1.GitHealthFailed {
			return nil, fmt.Errorf("repository %s is not healthy", repository.Name)
		}
		repositoryID = repository.Status.ID
	}
	return repositoryID, nil
}

func (r *ServiceReconciler) svcConfiguration(ctx context.Context, service *v1alpha1.ServiceDeployment) ([]*console.ConfigAttributes, bool, error) {
	configuration := make([]*console.ConfigAttributes, 0)
	hasConfig := false
	if service.Spec.ConfigurationRef != nil {
		secret := &corev1.Secret{}
		if err := r.Get(ctx, types.NamespacedName{Name: service.Spec.ConfigurationRef.Name, Namespace: service.Spec.ConfigurationRef.Namespace}, secret); err != nil {
			return nil, false, fmt.Errorf("error while getting configuration secret: %s", err.Error())
		}

		hasConfig = true
		for k, v := range secret.Data {
			configuration = append(configuration, &console.ConfigAttributes{Name: k, Value: lo.ToPtr(string(v))})
		}
	}

	if len(service.Spec.Configuration) > 0 {
		hasConfig = true
		for k, v := range service.Spec.Configuration {
			configuration = append(configuration, &console.ConfigAttributes{Name: k, Value: lo.ToPtr(v)})
		}
	}
	return configuration, hasConfig, nil
}

func (r *ServiceReconciler) getStackID(ctx context.Context, obj corev1.ObjectReference) (*string, error) {
	stack := &v1alpha1.InfrastructureStack{}
	if err := r.Get(ctx, client.ObjectKey{Name: obj.Name, Namespace: obj.Namespace}, stack); err != nil {
		return nil, err
	}
	if !stack.Status.HasID() {
		return nil, fmt.Errorf("stack is not ready")
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
	logger := log.FromContext(ctx)
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

			if stack.Annotations == nil {
				stack.Annotations = map[string]string{}
			}

			serviceNameNamespace := fmt.Sprintf("%s/%s", service.GetNamespace(), service.GetName())
			if stack.Annotations[ServiceOwnerAnnotation] == serviceNameNamespace {
				continue
			}
			stack.Annotations[ServiceOwnerAnnotation] = serviceNameNamespace

			// ignore error. It's for the backward compatibility
			if err := controllerutil.RemoveOwnerReference(service, stack, r.Scheme); err != nil {
				logger.V(5).Info(err.Error())
			}
			err = utils.TryToUpdate(ctx, r.Client, stack)
			if err != nil {
				return err
			}
		}
	}

	return nil
}

func (r *ServiceReconciler) addOrRemoveFinalizer(service *v1alpha1.ServiceDeployment) *ctrl.Result {
	// If the service is not being deleted and if it does not have the finalizer, then let's add it.
	if service.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(service, ServiceFinalizer) {
		controllerutil.AddFinalizer(service, ServiceFinalizer)
	}

	// If the service is being deleted, cleanup and remove the finalizer.
	if !service.DeletionTimestamp.IsZero() {
		// If the service does not have an ID, the finalizer can be removed.
		if !service.Status.HasID() {
			controllerutil.RemoveFinalizer(service, ServiceFinalizer)
			return &ctrl.Result{}
		}

		// If the service is already being deleted from Console API, requeue.
		if r.ConsoleClient.IsServiceDeleting(service.Status.GetID()) {
			return &waitForResources
		}

		exists, err := r.ConsoleClient.IsServiceExisting(service.Status.GetID())
		if err != nil {
			return &requeue
		}

		// Remove service from Console API if it exists and is not read-only.
		if exists && !service.Status.IsReadonly() {
			if err := r.deleteService(service.Status.GetID(), service.Spec.Detach); err != nil {
				// If it fails to delete the external dependency here, return with the error
				// so that it can be retried.
				utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return &ctrl.Result{}
			}

			// If the deletion process started requeue so that we can make sure the service
			// has been deleted from Console API before removing the finalizer.
			return &waitForResources
		}

		// If our finalizer is present, remove it.
		controllerutil.RemoveFinalizer(service, ServiceFinalizer)

		// Stop reconciliation as the item does no longer exist.
		return &ctrl.Result{}
	}

	return nil
}

func (r *ServiceReconciler) deleteService(id string, detach bool) error {
	if detach {
		return r.ConsoleClient.DetachService(id)
	}
	return r.ConsoleClient.DeleteService(id)
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
		return apierrors.NewNotFound(schema.GroupResource{}, "bindings")
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
		Watches(&v1alpha1.InfrastructureStack{}, OnInfrastructureStackChange(r.Client, new(v1alpha1.ServiceDeployment))).
		For(&v1alpha1.ServiceDeployment{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Owns(&corev1.Secret{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})).
		Owns(&corev1.ConfigMap{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})).
		Complete(r)
}

func OnInfrastructureStackChange[T client.Object](c client.Client, obj T) handler.EventHandler {
	return handler.EnqueueRequestsFromMapFunc(func(ctx context.Context, stack client.Object) []reconcile.Request {
		requests := make([]reconcile.Request, 0)
		if stack.GetAnnotations() == nil {
			return requests
		}
		service, ok := stack.GetAnnotations()[ServiceOwnerAnnotation]
		if !ok {
			return requests
		}
		s := strings.Split(service, "/")
		if len(s) != 2 {
			return requests
		}
		namespace := s[0]
		name := s[1]

		if err := c.Get(ctx, client.ObjectKey{Name: name, Namespace: namespace}, obj); err == nil {
			requests = append(requests, reconcile.Request{NamespacedName: types.NamespacedName{Name: name, Namespace: namespace}})
		}

		return requests
	})
}
