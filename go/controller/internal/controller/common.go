package controller

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

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

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/cache"
	"github.com/pluralsh/console/go/controller/internal/errors"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

const (
	requeueDefault          = 30 * time.Second
	requeueWaitForResources = 5 * time.Second
)

var (
	requeue          = ctrl.Result{RequeueAfter: requeueDefault}
	waitForResources = ctrl.Result{RequeueAfter: requeueWaitForResources}
)

// TODO: Remove.
func notFoundOrReadyErrorMessage(err error) string {
	return fmt.Sprintf("Referenced object is either not found or not ready, found error: %s", err.Error())
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
		result = &waitForResources
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

func ensureBindings(bindings []v1alpha1.Binding, userGroupCache cache.UserGroupCache) ([]v1alpha1.Binding, bool, error) {
	requeue := false
	for i := range bindings {
		binding, req, err := ensureBinding(bindings[i], userGroupCache)
		if err != nil {
			return bindings, req, err
		}

		requeue = requeue || req
		bindings[i] = binding
	}

	return bindings, requeue, nil
}

func ensureBinding(binding v1alpha1.Binding, userGroupCache cache.UserGroupCache) (v1alpha1.Binding, bool, error) {
	requeue := false
	if binding.GroupName == nil && binding.UserEmail == nil {
		return binding, requeue, nil
	}

	if binding.GroupName != nil {
		groupID, err := userGroupCache.GetGroupID(*binding.GroupName)
		if err != nil && !errors.IsNotFound(err) {
			return binding, requeue, err
		}

		requeue = errors.IsNotFound(err)
		binding.GroupID = lo.EmptyableToPtr(groupID)
	}

	if binding.UserEmail != nil {
		userID, err := userGroupCache.GetUserID(*binding.UserEmail)
		if err != nil && !errors.IsNotFound(err) {
			return binding, requeue, err
		}

		requeue = errors.IsNotFound(err)
		binding.UserID = lo.EmptyableToPtr(userID)
	}

	return binding, requeue, nil
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
		Name:         srv.Name,
		Namespace:    srv.Namespace,
		Templated:    lo.ToPtr(true),
		RepositoryID: repositoryID,
		Protect:      srv.Protect,
		SyncConfig:   syncConf,
	}
	if len(srv.Dependencies) > 0 {
		serviceTemplate.Dependencies = make([]*console.ServiceDependencyAttributes, 0)

		for _, dep := range srv.Dependencies {
			serviceTemplate.Dependencies = append(serviceTemplate.Dependencies, &console.ServiceDependencyAttributes{Name: dep.Name})
		}
	}

	if srv.Templated != nil {
		serviceTemplate.Templated = srv.Templated
	}
	if srv.Contexts != nil {
		serviceTemplate.Contexts = make([]*string, 0)
		serviceTemplate.Contexts = algorithms.Map(srv.Contexts,
			func(b string) *string { return &b })
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
		serviceTemplate.Configuration = make([]*console.ConfigAttributes, 0)
		secret := &corev1.Secret{}
		name := types.NamespacedName{Name: srv.ConfigurationRef.Name, Namespace: srv.ConfigurationRef.Namespace}
		err := c.Get(ctx, name, secret)
		if err != nil {
			return nil, err
		}
		for k, v := range secret.Data {
			value := string(v)
			serviceTemplate.Configuration = append(serviceTemplate.Configuration, &console.ConfigAttributes{
				Name:  k,
				Value: &value,
			})
		}
	}
	return serviceTemplate, nil
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
