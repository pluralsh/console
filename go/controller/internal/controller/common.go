package controller

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"slices"
	"strings"
	"time"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/klog/v2"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/pluralsh/polly/algorithms"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	runtimeclient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/yaml"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/internal/log"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/cache"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

const (
	requeueDefault          = 30 * time.Second
	requeueWaitForResources = 5 * time.Second

	// OwnedByAnnotationName is an annotation used to mark resources that are owned by our CRDs.
	// It is used instead of the standard owner reference to avoid garbage collection of resources
	// but still be able to reconcile them.
	OwnedByAnnotationName = "deployments.plural.sh/owned-by"
)

func jitterRequeue(t time.Duration) ctrl.Result {
	return ctrl.Result{RequeueAfter: t + time.Duration(rand.Intn(int(t/2)))}
}

// handleRequeue allows avoiding rate limiting when some errors occur,
// i.e., when a resource is not created yet, or when it is waiting for an ID.
//
// If the result is set, then any potential error will be saved in a condition
// and ignored in the return to avoid rate limiting.
//
// If not found error is detected, then the result is automatically changed to
// wait for resources.
//
// It is important that at least one from a result or an error have to be non-nil.
func handleRequeue(result *ctrl.Result, err error, setCondition func(condition metav1.Condition)) (ctrl.Result, error) {
	if err != nil && apierrors.IsNotFound(err) {
		result = lo.ToPtr(jitterRequeue(requeueWaitForResources))
	}

	utils.MarkCondition(setCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse,
		v1alpha1.SynchronizedConditionReasonError, defaultErrMessage(err, ""))
	return lo.FromPtr(result), lo.Ternary(result != nil, nil, err)
}

// defaultErrMessage extracts error message if error is non-nil, otherwise it returns default message.
func defaultErrMessage(err error, defaultMessage string) string {
	if err != nil {
		return err.Error()
	}

	return defaultMessage
}

func ensureBindings(bindings []v1alpha1.Binding, userGroupCache cache.UserGroupCache) ([]v1alpha1.Binding, error) {
	for i := range bindings {
		binding, err := ensureBinding(bindings[i], userGroupCache)
		if err != nil {
			return bindings, err
		}

		bindings[i] = binding
	}

	return bindings, nil
}

func ensureBinding(binding v1alpha1.Binding, userGroupCache cache.UserGroupCache) (v1alpha1.Binding, error) {
	if binding.GroupName == nil && binding.UserEmail == nil {
		return binding, apierrors.NewNotFound(schema.GroupResource{Resource: "group/user"}, "nil")
	}

	if binding.GroupName != nil {
		groupID, err := userGroupCache.GetGroupID(*binding.GroupName)
		if err != nil {
			return binding, err
		}

		binding.GroupID = lo.EmptyableToPtr(groupID)
	}

	if binding.UserEmail != nil {
		userID, err := userGroupCache.GetUserID(*binding.UserEmail)
		if err != nil {
			return binding, err
		}

		binding.UserID = lo.EmptyableToPtr(userID)
	}

	return binding, nil
}

func policyBindings(bindings []v1alpha1.Binding) []*console.PolicyBindingAttributes {
	if bindings == nil {
		return nil
	}

	filtered := algorithms.Filter(bindings, func(b v1alpha1.Binding) bool {
		return b.UserID != nil || b.GroupID != nil
	})

	return algorithms.Map(filtered, func(b v1alpha1.Binding) *console.PolicyBindingAttributes {
		return b.Attributes()
	})
}

func genServiceTemplate(ctx context.Context, c runtimeclient.Client, namespace string, srv *v1alpha1.ServiceTemplate, repositoryID *string) (*console.ServiceTemplateAttributes, error) {
	syncConf, err := srv.SyncConfig.Attributes()
	if err != nil {
		return nil, err
	}
	serviceTemplate := &console.ServiceTemplateAttributes{
		Name:          srv.Name,
		Namespace:     srv.Namespace,
		Templated:     lo.ToPtr(true),
		RepositoryID:  repositoryID,
		Protect:       srv.Protect,
		SyncConfig:    syncConf,
		Configuration: make([]*console.ConfigAttributes, 0),
	}
	if len(srv.Dependencies) > 0 {
		serviceTemplate.Dependencies = make([]*console.ServiceDependencyAttributes, 0)

		for _, dep := range srv.Dependencies {
			serviceTemplate.Dependencies = append(serviceTemplate.Dependencies, &console.ServiceDependencyAttributes{Name: dep.Name})
		}

		slices.SortFunc(serviceTemplate.Dependencies, func(a, b *console.ServiceDependencyAttributes) int {
			return strings.Compare(a.Name, b.Name)
		})
	}

	if srv.Templated != nil {
		serviceTemplate.Templated = srv.Templated
	}
	if srv.Contexts != nil {
		slices.Sort(srv.Contexts)
		serviceTemplate.Contexts = lo.ToSlicePtr(srv.Contexts)
	}
	if srv.Git != nil {
		serviceTemplate.Git = &console.GitRefAttributes{
			Ref:    srv.Git.Ref,
			Folder: srv.Git.Folder,
			Files:  srv.Git.Files,
		}
	}
	if srv.Helm != nil {
		serviceTemplate.Helm = &console.HelmConfigAttributes{
			ValuesFiles: srv.Helm.ValuesFiles,
			Version:     srv.Helm.Version,
			URL:         srv.Helm.URL,
			IgnoreHooks: srv.Helm.IgnoreHooks,
			IgnoreCrds:  srv.Helm.IgnoreCrds,
			LuaScript:   srv.Helm.LuaScript,
			LuaFile:     srv.Helm.LuaFile,
			LuaFolder:   srv.Helm.LuaFolder,
			Git:         srv.Helm.Git.Attributes(),
		}
		if srv.Helm.Repository != nil {
			serviceTemplate.Helm.Repository = &console.NamespacedName{
				Name:      srv.Helm.Repository.Name,
				Namespace: srv.Helm.Repository.Namespace,
			}
		}
		if srv.Helm.ValuesConfigMapRef != nil {
			val, err := utils.GetConfigMapData(ctx, c, namespace, srv.Helm.ValuesConfigMapRef)
			if err != nil {
				return nil, err
			}
			serviceTemplate.Helm.Values = &val
		}

		if srv.Helm.ValuesFrom != nil || srv.Helm.Values != nil {
			values, err := mergeHelmValues(ctx, c, srv.Helm.ValuesFrom, srv.Helm.Values)
			if err != nil {
				return nil, err
			}
			serviceTemplate.Helm.Values = values
		}

		if srv.Helm.Chart != nil {
			serviceTemplate.Helm.Chart = srv.Helm.Chart
		}
	}
	if srv.Kustomize != nil {
		serviceTemplate.Kustomize = &console.KustomizeAttributes{
			Path: srv.Kustomize.Path,
		}
	}
	if srv.ConfigurationRef != nil {
		secret := &corev1.Secret{}
		name := types.NamespacedName{Name: srv.ConfigurationRef.Name, Namespace: srv.ConfigurationRef.Namespace}
		err := c.Get(ctx, name, secret)
		if err != nil {
			return nil, err
		}
		for k, v := range secret.Data {
			serviceTemplate.Configuration = append(serviceTemplate.Configuration, &console.ConfigAttributes{
				Name:  k,
				Value: lo.ToPtr(string(v)),
			})
		}
	}

	if len(srv.Configuration) > 0 {
		for k, v := range srv.Configuration {
			serviceTemplate.Configuration = append(serviceTemplate.Configuration, &console.ConfigAttributes{
				Name:  k,
				Value: lo.ToPtr(v),
			})
		}
	}
	slices.SortFunc(serviceTemplate.Configuration, func(a, b *console.ConfigAttributes) int {
		return strings.Compare(a.Name, b.Name)
	})

	if err := getSources(ctx, c, serviceTemplate, srv.Sources); err != nil {
		return nil, err
	}

	getRenderers(serviceTemplate, srv.Renderers)
	return serviceTemplate, nil
}

func getSources(ctx context.Context, c runtimeclient.Client, attr *console.ServiceTemplateAttributes, sources []v1alpha1.Source) error {
	if len(sources) > 0 {
		attr.Sources = make([]*console.ServiceSourceAttributes, 0)
		for _, source := range sources {
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
			if source.RepositoryRef != nil {
				name := v1alpha1.NamespacedName{Name: source.RepositoryRef.Name, Namespace: source.RepositoryRef.Namespace}
				repositoryID, err := getGitRepoID(ctx, c, name)
				if err != nil {
					return err
				}
				newSource.RepositoryID = repositoryID
			}
			attr.Sources = append(attr.Sources, newSource)
		}
	}
	return nil
}

func getRenderers(attr *console.ServiceTemplateAttributes, renderers []v1alpha1.Renderer) {
	if len(renderers) > 0 {
		attr.Renderers = make([]*console.RendererAttributes, 0)
		for _, renderer := range renderers {
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

func containerResourceRequests(requests *v1alpha1.ContainerResourceRequests) *console.ResourceRequestAttributes {
	if requests == nil {
		return nil
	}

	return &console.ResourceRequestAttributes{
		CPU:    requests.CPU,
		Memory: requests.Memory,
	}
}

func containerResources(resources *v1alpha1.ContainerResources) *console.ContainerResourcesAttributes {
	if resources == nil {
		return nil
	}

	return &console.ContainerResourcesAttributes{
		Requests: containerResourceRequests(resources.Requests),
		Limits:   containerResourceRequests(resources.Limits),
	}
}

func gateJobAttributes(job *v1alpha1.JobSpec) (*console.GateJobAttributes, error) {
	if job == nil {
		return nil, nil
	}

	var annotations, labels, raw *string
	if job.Annotations != nil {
		result, err := json.Marshal(job.Annotations)
		if err != nil {
			return nil, err
		}
		annotations = lo.ToPtr(string(result))
	}
	if job.Labels != nil {
		result, err := json.Marshal(job.Labels)
		if err != nil {
			return nil, err
		}
		labels = lo.ToPtr(string(result))
	}
	if job.Raw != nil {
		rawData, err := json.Marshal(job.Raw)
		if err != nil {
			return nil, err
		}
		raw = lo.ToPtr(string(rawData))
	}

	return &console.GateJobAttributes{
		Namespace: job.Namespace,
		Raw:       raw,
		Resources: containerResources(job.Resources),
		Containers: algorithms.Map(job.Containers,
			func(c *v1alpha1.Container) *console.ContainerAttributes {
				return &console.ContainerAttributes{
					Image: c.Image,
					Args:  c.Args,
					Env: algorithms.Map(c.Env, func(e *v1alpha1.Env) *console.EnvAttributes {
						return &console.EnvAttributes{
							Name:  e.Name,
							Value: e.Value,
						}
					}),
					Resources: containerResources(c.Resources),
					EnvFrom: algorithms.Map(c.EnvFrom, func(e *v1alpha1.EnvFrom) *console.EnvFromAttributes {
						return &console.EnvFromAttributes{
							Secret:    e.Secret,
							ConfigMap: e.ConfigMap,
						}
					}),
				}
			}),
		Labels:         labels,
		Annotations:    annotations,
		ServiceAccount: job.ServiceAccount,
	}, nil
}

func mergeHelmValues(ctx context.Context, c runtimeclient.Client, secretRef *corev1.SecretReference, values *runtime.RawExtension) (*string, error) {
	valuesFromMap := map[string]interface{}{}
	valuesMap := map[string]interface{}{}

	if secretRef != nil {
		valuesFromSecret, err := utils.GetSecret(ctx, c, secretRef)
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

func getGitRepoID(ctx context.Context, c runtimeclient.Client, namespacedName v1alpha1.NamespacedName) (*string, error) {
	gitRepo := &v1alpha1.GitRepository{}
	if err := c.Get(ctx, types.NamespacedName{Name: namespacedName.Name, Namespace: namespacedName.Namespace}, gitRepo); err != nil {
		return nil, err
	}
	return gitRepo.Status.ID, nil
}

func GetProject(ctx context.Context, c runtimeclient.Client, scheme *runtime.Scheme, obj interface{}) (*v1alpha1.Project, *ctrl.Result, error) {
	project := &v1alpha1.Project{}

	unstructuredObj, err := runtime.DefaultUnstructuredConverter.ToUnstructured(obj)
	if err != nil {
		return nil, nil, err
	}
	var objMeta metav1.Object = &unstructured.Unstructured{Object: unstructuredObj}

	projectRefData, found, _ := unstructured.NestedMap(unstructuredObj, "spec", "projectRef")
	if !found {
		return project, nil, nil
	}
	projectRef := &corev1.ObjectReference{}
	if err = runtime.DefaultUnstructuredConverter.FromUnstructured(projectRefData, projectRef); err != nil {
		return nil, nil, err
	}

	if err := c.Get(ctx, runtimeclient.ObjectKey{Name: projectRef.Name}, project); err != nil {
		return nil, nil, err
	}

	if !project.Status.HasID() {
		return nil, lo.ToPtr(jitterRequeue(requeueWaitForResources)), fmt.Errorf("project is not ready")
	}

	if err := controllerutil.SetOwnerReference(project, objMeta, scheme); err != nil {
		return nil, nil, fmt.Errorf("could not set owner reference: %+v", err)
	}

	return project, nil, nil
}

func OwnedByEventHandler(ownerGk *metav1.GroupKind) handler.EventHandler {
	return handler.EnqueueRequestsFromMapFunc(func(ctx context.Context, obj runtimeclient.Object) []reconcile.Request {
		if !HasAnnotation(obj, OwnedByAnnotationName) {
			return nil
		}

		ownedBy := obj.GetAnnotations()[OwnedByAnnotationName]
		annotationGk, namespacedName, err := fromAnnotation(ownedBy)
		if err != nil {
			klog.ErrorS(err, "failed to parse owned-by annotation", "annotation", ownedBy)
			return nil
		}

		if ownerGk != nil && !strings.EqualFold(annotationGk.String(), ownerGk.String()) {
			klog.V(log.LogLevelDebug).InfoS(
				"owned-by annotation does not match expected group kind",
				"ownerGk", ownerGk.String(),
				"annotationGk", annotationGk.String(),
			)
			return nil
		}

		klog.V(log.LogLevelDebug).InfoS("enqueueing request for owned-by annotation",
			"annotation", ownedBy,
		)
		return []reconcile.Request{{NamespacedName: namespacedName}}
	})
}

func HasAnnotation(obj runtimeclient.Object, annotation string) bool {
	if obj.GetAnnotations() == nil {
		return false
	}

	value, exists := obj.GetAnnotations()[annotation]
	_, _, err := fromAnnotation(value)
	return exists && err == nil
}

func toAnnotation(gk metav1.GroupKind, namespacedName types.NamespacedName) string {
	return strings.ToLower(fmt.Sprintf("%s/%s/%s/%s", gk.Group, gk.Kind, namespacedName.Namespace, namespacedName.Name))
}

func fromAnnotation(annotation string) (metav1.GroupKind, types.NamespacedName, error) {
	parts := strings.Split(annotation, "/")
	if len(parts) != 4 {
		return metav1.GroupKind{}, types.NamespacedName{}, fmt.Errorf("the annotation has wrong format %s", annotation)
	}

	gk := metav1.GroupKind{
		Group: parts[0],
		Kind:  parts[1],
	}

	return gk, types.NamespacedName{
		Namespace: parts[2],
		Name:      parts[3],
	}, nil
}

func TryAddOwnedByAnnotation(ctx context.Context, client runtimeclient.Client, owner runtimeclient.Object, child runtimeclient.Object) error {
	if HasAnnotation(child, OwnedByAnnotationName) {
		klog.V(log.LogLevelDebug).InfoS("owned-by annotation already exists", "annotation", OwnedByAnnotationName, "owner", owner.GetName(), "child", child.GetName())
		return nil
	}

	annotations := child.GetAnnotations()
	if annotations == nil {
		annotations = make(map[string]string)
	}

	annotations[OwnedByAnnotationName] = toAnnotation(GroupKindFromObject(owner), types.NamespacedName{
		Namespace: owner.GetNamespace(),
		Name:      owner.GetName(),
	})
	child.SetAnnotations(annotations)

	klog.V(log.LogLevelDebug).InfoS("adding owned-by annotation", "annotation", OwnedByAnnotationName, "owner", owner.GetName(), "child", child.GetName())
	return utils.TryToUpdate(ctx, client, child)
}

func GroupKindFromObject(obj runtimeclient.Object) metav1.GroupKind {
	gvk := obj.GetObjectKind().GroupVersionKind()

	return metav1.GroupKind{
		Group: gvk.Group,
		Kind:  gvk.Kind,
	}
}
