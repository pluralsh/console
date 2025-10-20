package common

import (
	"context"
	"slices"
	"strings"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/utils"
	"github.com/pluralsh/polly/algorithms"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	runtimeclient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/yaml"
)

func ServiceTemplate(ctx context.Context, c runtimeclient.Client, namespace string, srv *v1alpha1.ServiceTemplate, repositoryID *string) (*console.ServiceTemplateAttributes, error) {
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

	if err := setSources(ctx, c, serviceTemplate, srv.Sources); err != nil {
		return nil, err
	}

	setRenderers(serviceTemplate, srv.Renderers)

	return serviceTemplate, nil
}

func setSources(ctx context.Context, c runtimeclient.Client, attr *console.ServiceTemplateAttributes, sources []v1alpha1.Source) error {
	if len(sources) > 0 {
		attr.Sources = make([]*console.ServiceSourceAttributes, 0)
		for _, source := range sources {
			newSource := &console.ServiceSourceAttributes{Path: source.Path}

			if source.Git != nil {
				newSource.Git = &console.GitRefAttributes{
					Ref:    source.Git.Ref,
					Folder: source.Git.Folder,
					Files:  source.Git.Files,
				}
			}

			if source.RepositoryRef != nil {
				name := types.NamespacedName{Name: source.RepositoryRef.Name, Namespace: source.RepositoryRef.Namespace}
				repository := &v1alpha1.GitRepository{}
				if err := c.Get(ctx, name, repository); err != nil {
					return err
				}

				newSource.RepositoryID = repository.Status.ID
			}

			attr.Sources = append(attr.Sources, newSource)
		}
	}
	return nil
}

func setRenderers(attr *console.ServiceTemplateAttributes, renderers []v1alpha1.Renderer) {
	if len(renderers) > 0 {
		attr.Renderers = make([]*console.RendererAttributes, 0)
		for _, renderer := range renderers {
			newRenderer := &console.RendererAttributes{Path: renderer.Path, Type: renderer.Type}

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
