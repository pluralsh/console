package template

import (
	"bytes"
	"fmt"
	stdFs "io/fs"
	"os"
	"path/filepath"
	"strings"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"sigs.k8s.io/kustomize/api/krusty"
	"sigs.k8s.io/kustomize/api/types"
	"sigs.k8s.io/kustomize/kyaml/filesys"
	kyaml "sigs.k8s.io/kustomize/kyaml/yaml"
	"sigs.k8s.io/yaml"
)

const baseFileName = "base.yaml"

type kustomizePostrenderer struct {
	dir string
}

func NewKustomizePostrenderer(dir string) *kustomizePostrenderer {
	return &kustomizePostrenderer{dir}
}

func (k *kustomizePostrenderer) Render(svc *console.ServiceDeploymentForAgent, manifests []unstructured.Unstructured, mapper meta.RESTMapper) ([]unstructured.Unstructured, error) {
	if svc.Helm == nil {
		return manifests, nil
	}
	if svc.Helm.KustomizePostrender == nil {
		return manifests, nil
	}
	dir := filepath.Join(k.dir, lo.FromPtr(svc.Helm.KustomizePostrender))
	fs := filesys.MakeEmptyDirInMemory()
	overlayDir := "overlay"

	if err := fs.MkdirAll(overlayDir); err != nil {
		return nil, err
	}
	if err := templateLiquid(fs, overlayDir, dir, svc); err != nil {
		return nil, fmt.Errorf("error preparing kustomize overlay: %w", err)
	}

	// Serialize base manifests to YAML and write to the in-memory filesystem for kustomize to consume as a resource.
	// We write the base manifests as a single file `base.yaml` with multiple YAML documents separated by `---` to preserve the structure of the original manifests and avoid issues with kustomize parsing multiple files as separate resources.
	base, err := serializeUnstructured(manifests)
	if err != nil {
		return nil, err
	}
	if err := fs.WriteFile(filepath.Join(overlayDir, baseFileName), base); err != nil {
		return nil, err
	}

	opts := krusty.MakeDefaultOptions()
	opts.LoadRestrictions = types.LoadRestrictionsNone

	kustomizer := krusty.MakeKustomizer(opts)

	res, err := kustomizer.Run(fs, overlayDir)
	if err != nil {
		return nil, err
	}
	out, err := res.AsYaml()
	if err != nil {
		return nil, err
	}

	readerOptions := ReaderOptions{
		Mapper:           mapper,
		Namespace:        svc.Namespace,
		EnforceNamespace: false,
	}

	mReader := &StreamManifestReader{
		ReaderName:    "kustomize-postrenderer",
		Reader:        bytes.NewReader(out),
		ReaderOptions: readerOptions,
	}

	items, err := mReader.Read()
	if err != nil {
		return nil, err
	}

	return items, nil
}

func templateLiquid(dst filesys.FileSystem, overlayDir, src string, svc *console.ServiceDeploymentForAgent) error {
	return filepath.WalkDir(src, func(path string, entry stdFs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		if rel == "." {
			return nil
		}

		target := filepath.Join(overlayDir, rel)
		if entry.IsDir() {
			return dst.MkdirAll(target)
		}

		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		if strings.HasSuffix(entry.Name(), ".liquid") {
			data, err = renderLiquid(data, svc)
			if err != nil {
				return fmt.Errorf("templating error in %s: %w", rel, err)
			}
			target = strings.TrimSuffix(target, ".liquid")
		}
		if err := dst.MkdirAll(filepath.Dir(target)); err != nil {
			return err
		}
		if isKustomizationFile(target) {
			node, err := kyaml.Parse(string(data))
			if err != nil {
				return err
			}

			// Set resources: ["base.yaml"]
			// We use a single file with multiple YAML documents separated by `---` to preserve the structure of the original manifests and avoid issues with kustomize parsing multiple files as separate resources.
			err = node.PipeE(kyaml.SetField("resources", kyaml.NewListRNode(baseFileName)))
			if err != nil {
				return err
			}
			out, err := node.String()
			if err != nil {
				return err
			}
			data = []byte(out)
		}
		return dst.WriteFile(target, data)
	})
}

func serializeUnstructured(items []unstructured.Unstructured) ([]byte, error) {
	var buf bytes.Buffer

	for i, u := range items {
		data, err := u.MarshalJSON()
		if err != nil {
			return nil, err
		}

		toYAML, err := yaml.JSONToYAML(data)
		if err != nil {
			return nil, err
		}

		if i > 0 {
			buf.WriteString("\n---\n")
		}
		buf.Write(toYAML)
	}

	return buf.Bytes(), nil
}

func isKustomizationFile(name string) bool {
	if name == "" {
		return false
	}
	switch filepath.Base(name) {
	case "kustomization.yaml", "kustomization.yml", "Kustomization":
		return true
	default:
		return false
	}
}
