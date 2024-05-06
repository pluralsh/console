package controller

import (
	"context"
	"encoding/json"
	"time"

	console "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/console/controller/api/v1alpha1"
	"github.com/pluralsh/console/controller/internal/client"
	"github.com/pluralsh/console/controller/internal/utils"
	"github.com/pluralsh/polly/algorithms"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	runtimeclient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/yaml"
)

const (
	// requeueAfter is the time between scheduled reconciles if there are no changes to the CRD.
	requeueAfter = 30 * time.Second
)

var (
	requeue = ctrl.Result{RequeueAfter: requeueAfter}
)

func ensureBindings(bindings []v1alpha1.Binding, client client.ConsoleClient) ([]v1alpha1.Binding, error) {
	for i := range bindings {
		binding, err := ensureBinding(bindings[i], client)
		if err != nil {
			return bindings, err
		}

		bindings[i] = binding
	}

	return bindings, nil
}

func ensureBinding(binding v1alpha1.Binding, client client.ConsoleClient) (v1alpha1.Binding, error) {
	if binding.GroupName == nil && binding.UserEmail == nil {
		return binding, nil
	}

	if binding.GroupName != nil {
		group, err := client.GetGroup(*binding.GroupName)
		if err != nil {
			return binding, err
		}

		binding.GroupID = &group.ID
	}

	if binding.UserEmail != nil {
		user, err := client.GetUser(*binding.UserEmail)
		if err != nil {
			return binding, err
		}

		binding.UserID = &user.ID
	}

	return binding, nil
}

func genServiceTemplate(ctx context.Context, c runtimeclient.Client, namespace string, srv *v1alpha1.ServiceTemplate, repositoryID *string) (*console.ServiceTemplateAttributes, error) {
	serviceTemplate := &console.ServiceTemplateAttributes{
		Name:         srv.Name,
		Namespace:    srv.Namespace,
		Templated:    lo.ToPtr(true),
		RepositoryID: repositoryID,
	}
	if len(srv.Dependencies) > 0 {
		serviceTemplate.Dependencies = make([]*console.ServiceDependencyAttributes, 0)
	}
	for _, dep := range srv.Dependencies {
		serviceTemplate.Dependencies = append(serviceTemplate.Dependencies, &console.ServiceDependencyAttributes{Name: dep.Name})
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
	if srv.SyncConfig != nil {
		createNamespace := true
		var annotations *string
		var labels *string
		if srv.SyncConfig.CreateNamespace != nil {
			createNamespace = *srv.SyncConfig.CreateNamespace
		}
		if srv.SyncConfig.Annotations != nil {
			result, err := json.Marshal(srv.SyncConfig.Annotations)
			if err != nil {
				return nil, err
			}
			rawAnnotations := string(result)
			annotations = &rawAnnotations
		}
		if srv.SyncConfig.Labels != nil {
			result, err := json.Marshal(srv.SyncConfig.Labels)
			if err != nil {
				return nil, err
			}
			rawLabels := string(result)
			labels = &rawLabels
		}
		serviceTemplate.SyncConfig = &console.SyncConfigAttributes{
			CreateNamespace: lo.ToPtr(createNamespace),
			NamespaceMetadata: &console.MetadataAttributes{
				Labels:      labels,
				Annotations: annotations,
			},
		}
	}

	return serviceTemplate, nil
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
