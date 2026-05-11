package template

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/meta"

	console "github.com/pluralsh/console/go/client"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/kubectl/pkg/util/i18n"
	"k8s.io/kubectl/pkg/util/templates"
	"sigs.k8s.io/kustomize/kustomize/v5/commands/build"
	"sigs.k8s.io/kustomize/kyaml/filesys"
)

type kustomize struct {
	dir string
}

func NewKustomize(dir string) Template {
	return &kustomize{dir}
}

func (k *kustomize) Render(svc *console.ServiceDeploymentForAgent, mapper meta.RESTMapper) ([]unstructured.Unstructured, error) {
	out := &bytes.Buffer{}
	h := build.MakeHelp("plural", "kustomize")
	help := &build.Help{
		Use:     h.Use,
		Short:   i18n.T(h.Short),
		Long:    templates.LongDesc(i18n.T(h.Long)),
		Example: templates.Examples(i18n.T(h.Example)),
	}

	subdir := ""
	if svc.Kustomize != nil {
		subdir = svc.Kustomize.Path
	}

	command := build.NewCmdBuild(filesys.MakeFsOnDisk(), help, out)
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

	args := []string{dir}
	if svc.Kustomize != nil && svc.Kustomize.EnableHelm != nil && *svc.Kustomize.EnableHelm {
		args = append(args, "--enable-helm")
	}

	command.SetArgs(args)
	if err := command.Execute(); err != nil {
		return nil, err
	}

	r := bytes.NewReader(out.Bytes())

	readerOptions := ReaderOptions{
		Mapper:           mapper,
		Namespace:        svc.Namespace,
		EnforceNamespace: false,
	}
	mReader := &StreamManifestReader{
		ReaderName:    "kustomize",
		Reader:        r,
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
