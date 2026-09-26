package template

import (
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/common"
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

	// maxWarnings and maxWarningLength bound the warnings reported per render,
	// so that scripts cannot flood the service errors.
	maxWarnings      = 20
	maxWarningLength = 1024
)

type Template interface {
	Render(svc *console.ServiceDeploymentForAgent, mapper meta.RESTMapper) ([]unstructured.Unstructured, error)
}

// Warner is implemented by templates that can report non-fatal warnings raised while rendering,
// i.e. warnings emitted by Helm Lua and Python templating scripts.
type Warner interface {
	Warnings() []console.ServiceErrorAttributes
}

func Render(dir string, svc *console.ServiceDeploymentForAgent, mapper meta.RESTMapper) ([]unstructured.Unstructured, error) {
	manifests, _, err := RenderWithWarnings(dir, svc, mapper)
	return manifests, err
}

// RenderWithWarnings renders the service manifests and additionally returns all non-fatal
// warnings reported by the templates, ready to be sent as service errors.
func RenderWithWarnings(dir string, svc *console.ServiceDeploymentForAgent, mapper meta.RESTMapper) ([]unstructured.Unstructured, []console.ServiceErrorAttributes, error) {
	var warnings []console.ServiceErrorAttributes
	render := func(t Template, svc *console.ServiceDeploymentForAgent) ([]unstructured.Unstructured, error) {
		manifests, err := t.Render(svc, mapper)
		if w, ok := t.(Warner); ok {
			warnings = append(warnings, w.Warnings()...)
		}
		return manifests, err
	}

	var allManifests []unstructured.Unstructured
	defaultManifests, err := render(defaultTemplate(dir, svc), svc)
	if err != nil {
		return nil, warnings, err
	}
	allManifests = append(allManifests, defaultManifests...)

	for _, renderer := range svc.Renderers {
		var manifests []unstructured.Unstructured

		rendererPath := filepath.Join(dir, renderer.Path)
		switch renderer.Type {
		case console.RendererTypeAuto:
			manifests, err = render(defaultTemplate(rendererPath, svc), svc)
		case console.RendererTypeRaw:
			manifests, err = render(NewRaw(rendererPath), svc)
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
			manifests, err = render(NewHelm(rendererPath), &svcCopy)
		case console.RendererTypeKustomize:
			manifests, err = render(NewKustomize(rendererPath), svc)
		default:
			return nil, warnings, fmt.Errorf("unknown renderer type: %s", renderer.Type)
		}

		if err != nil {
			return nil, warnings, fmt.Errorf("error rendering path %s with type %s: %w", renderer.Path, renderer.Type, err)
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

	return allManifests, normalizeWarnings(warnings), nil
}

// normalizeWarnings trims messages, drops empty and duplicate warnings, and caps the count and message length.
// Order is preserved, so the result is deterministic for a given render.
func normalizeWarnings(warnings []console.ServiceErrorAttributes) []console.ServiceErrorAttributes {
	result := make([]console.ServiceErrorAttributes, 0, len(warnings))
	seen := make(map[console.ServiceErrorAttributes]struct{}, len(warnings))
	for _, warning := range warnings {
		warning.Message = strings.TrimSpace(warning.Message)
		if warning.Message == "" {
			continue
		}
		if len(warning.Message) > maxWarningLength {
			warning.Message = strings.ToValidUTF8(warning.Message[:maxWarningLength], "") + "..."
		}

		key := console.ServiceErrorAttributes{Source: warning.Source, Message: warning.Message}
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}

		result = append(result, warning)
		if len(result) == maxWarnings {
			break
		}
	}
	return result
}

func defaultTemplate(dir string, svc *console.ServiceDeploymentForAgent) Template {
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
		return NewKustomize(dir)
	}

	if renderer == RendererHelm {
		return NewHelm(dir)
	}

	return NewRaw(dir)
}
