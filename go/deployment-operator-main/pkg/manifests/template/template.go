package template

import (
	"fmt"
	"os"
	"path/filepath"
	"slices"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/deployment-operator/pkg/streamline/common"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

type Renderer string

const (
	RendererHelm      Renderer = "helm"
	RendererRaw       Renderer = "raw"
	RendererKustomize Renderer = "kustomize"

	ChartFileName = "Chart.yaml"
)

type Template interface {
	Render(svc *console.ServiceDeploymentForAgent, mapper meta.RESTMapper) ([]unstructured.Unstructured, error)
}

func Render(dir string, svc *console.ServiceDeploymentForAgent, mapper meta.RESTMapper) ([]unstructured.Unstructured, error) {
	var allManifests []unstructured.Unstructured
	defaultManifests, err := renderDefault(dir, svc, mapper)
	if err != nil {
		return nil, err
	}
	allManifests = append(allManifests, defaultManifests...)

	for _, renderer := range svc.Renderers {
		var manifests []unstructured.Unstructured

		rendererPath := filepath.Join(dir, renderer.Path)
		switch renderer.Type {
		case console.RendererTypeAuto:
			manifests, err = renderDefault(rendererPath, svc, mapper)
		case console.RendererTypeRaw:
			manifests, err = NewRaw(rendererPath).Render(svc, mapper)
		case console.RendererTypeHelm:
			svcCopy := *svc
			if renderer.Helm != nil {
				svcCopy.Helm = &console.ServiceDeploymentForAgent_Helm{
					Values:      renderer.Helm.Values,
					ValuesFiles: renderer.Helm.ValuesFiles,
					Release:     renderer.Helm.Release,
					IgnoreHooks: renderer.Helm.IgnoreHooks,
				}
			}
			manifests, err = NewHelm(rendererPath).Render(&svcCopy, mapper)
		case console.RendererTypeKustomize:
			manifests, err = NewKustomize(rendererPath).Render(svc, mapper)
		default:
			return nil, fmt.Errorf("unknown renderer type: %s", renderer.Type)
		}

		if err != nil {
			return nil, fmt.Errorf("error rendering path %s with type %s: %w", renderer.Path, renderer.Type, err)
		}

		allManifests = append(allManifests, manifests...)
	}

	if len(svc.Renderers) > 0 {
		slices.Reverse(allManifests)
		allManifests = lo.UniqBy(allManifests, func(item unstructured.Unstructured) string {
			return common.NewKeyFromUnstructured(item).String()
		})
		slices.Reverse(allManifests)
	}

	return allManifests, nil
}

func renderDefault(dir string, svc *console.ServiceDeploymentForAgent, mapper meta.RESTMapper) ([]unstructured.Unstructured, error) {
	renderer := RendererRaw

	_ = filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			fmt.Printf("error walking path %s: %s\n", path, err)
			return nil
		}

		for _, file := range []string{ChartFileName, "values.yaml"} {
			if !info.IsDir() && info.Name() == file {
				renderer = RendererHelm
				return nil
			}
		}

		if info.Name() == "kustomization.yaml" {
			renderer = RendererKustomize
		}

		return nil
	})

	if svc.Kustomize != nil || renderer == RendererKustomize {
		return NewKustomize(dir).Render(svc, mapper)
	}

	if renderer == RendererHelm {
		return NewHelm(dir).Render(svc, mapper)
	}

	return NewRaw(dir).Render(svc, mapper)
}
