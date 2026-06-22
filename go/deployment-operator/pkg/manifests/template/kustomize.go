package template

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"sigs.k8s.io/kustomize/api/krusty"
	"sigs.k8s.io/kustomize/kyaml/filesys"
)

type kustomize struct {
	dir string
}

func NewKustomize(dir string) Template {
	return &kustomize{dir}
}

func (k *kustomize) Render(svc *console.ServiceDeploymentForAgent, mapper meta.RESTMapper) ([]unstructured.Unstructured, error) {
	enableHelm := false
	subdir := ""
	if svc.Kustomize != nil {
		subdir = svc.Kustomize.Path
		enableHelm = svc.Kustomize.EnableHelm != nil && *svc.Kustomize.EnableHelm
	}

	dir := filepath.Join(k.dir, subdir)
	if err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}

		if ext := strings.ToLower(filepath.Ext(info.Name())); !lo.Contains([]string{".liquid"}, ext) {
			return nil
		}
		rpath, err := filepath.Rel(dir, path)
		if err != nil {
			return err
		}

		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		data, err = renderLiquid(data, svc)
		if err != nil {
			return fmt.Errorf("templating error in %s: %w", rpath, err)
		}
		newPath := strings.TrimSuffix(path, ".liquid")
		return writeFile(newPath, data)
	}); err != nil {
		return nil, err
	}

	kustomizer := krusty.MakeKustomizer(makeKrustyOptions(enableHelm))
	res, err := kustomizer.Run(filesys.MakeFsOnDisk(), dir)
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
		ReaderName:    "kustomize",
		Reader:        bytes.NewReader(out),
		ReaderOptions: readerOptions,
	}

	items, err := mReader.Read()
	if err != nil {
		return nil, err
	}
	return items, nil
}

func writeFile(name string, content []byte) error {
	if err := os.MkdirAll(filepath.Dir(name), 0755); err != nil {
		return err
	}
	return os.WriteFile(name, content, 0644)
}
