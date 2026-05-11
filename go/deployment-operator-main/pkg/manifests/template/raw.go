package template

import (
	"bytes"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/template"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/pluralsh/deployment-operator/pkg/streamline/common"
)

var (
	extensions = []string{".json", ".yaml", ".yml", ".liquid", ".yaml.liquid", ".yml.liquid", ".json.liquid"}
)

type raw struct {
	dir string
}

func NewRaw(dir string) *raw {
	return &raw{dir}
}

func bindings(svc *console.ServiceDeploymentForAgent) map[string]interface{} {
	return map[string]interface{}{
		"configuration": configMap(svc),
		"cluster":       clusterConfiguration(svc.Cluster),
		"contexts":      contexts(svc),
		"imports":       imports(svc),
		"service":       serviceConfiguration(svc),
	}
}

func renderLiquid(input []byte, svc *console.ServiceDeploymentForAgent) ([]byte, error) {
	bindings := bindings(svc)
	return template.RenderLiquid(input, bindings)
}

func (r *raw) Render(svc *console.ServiceDeploymentForAgent, mapper meta.RESTMapper) ([]unstructured.Unstructured, error) {
	res := make([]unstructured.Unstructured, 0)
	readerOptions := ReaderOptions{
		Mapper:           mapper,
		Namespace:        svc.Namespace,
		EnforceNamespace: false,
	}

	if err := filepath.WalkDir(r.dir, func(path string, info fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}

		if ext := strings.ToLower(filepath.Ext(info.Name())); !lo.Contains(extensions, ext) {
			return nil
		}
		rpath, err := filepath.Rel(r.dir, path)
		if err != nil {
			return err
		}

		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		if isTemplated(svc) && strings.HasSuffix(path, ".liquid") {
			data, err = renderLiquid(data, svc)
			if err != nil {
				return fmt.Errorf("templating error in %s: %w", rpath, err)
			}
		}

		r := bytes.NewReader(data)

		mReader := &StreamManifestReader{
			ReaderName:    "raw",
			Reader:        r,
			ReaderOptions: readerOptions,
		}
		items, err := mReader.Read()

		if err != nil {
			return fmt.Errorf("failed to parse %s: %w", rpath, err)
		}

		res = append(res, items...)
		return nil
	}); err != nil {
		return nil, err
	}

	unique := map[string]struct{}{}
	final := make([]unstructured.Unstructured, 0, len(res))
	for _, item := range res {
		key := string(common.NewKeyFromUnstructured(item))
		if _, ok := unique[key]; !ok {
			unique[key] = struct{}{}
			final = append(final, item)
		}
	}

	return final, nil
}
