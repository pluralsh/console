package template

import (
	"io"

	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"sigs.k8s.io/kustomize/kyaml/kio"
	"sigs.k8s.io/kustomize/kyaml/kio/filters"
	"sigs.k8s.io/kustomize/kyaml/kio/kioutil"
)

// ReaderOptions defines the shared inputs for the different
// implementations of the ManifestReader interface.
type ReaderOptions struct {
	Mapper           meta.RESTMapper
	Validate         bool
	Namespace        string
	EnforceNamespace bool
}

// StreamManifestReader reads manifest from the provided io.Reader
// and returns them as Info objects. The returned Infos will not have
// client or mapping set.
type StreamManifestReader struct {
	ReaderName string
	Reader     io.Reader

	ReaderOptions
}

func streamManifests(in io.Reader, mapper meta.RESTMapper, name, namespace string) ([]unstructured.Unstructured, error) {
	readerOptions := ReaderOptions{
		Mapper:           mapper,
		Namespace:        namespace,
		EnforceNamespace: false,
	}
	mReader := &StreamManifestReader{
		ReaderName:    name,
		Reader:        in,
		ReaderOptions: readerOptions,
	}

	return mReader.Read()
}

// Read reads the manifests and returns them as Info objects.
func (r *StreamManifestReader) Read() ([]unstructured.Unstructured, error) {
	nodes, err := (&kio.ByteReader{Reader: r.Reader}).Read()
	if err != nil {
		return nil, err
	}

	objs := make([]unstructured.Unstructured, 0, len(nodes))
	for _, n := range nodes {
		err = RemoveAnnotations(n, kioutil.IndexAnnotation)
		if err != nil {
			return objs, err
		}

		u, err := KyamlNodeToUnstructured(n)
		if err != nil {
			return objs, err
		}

		if n == nil {
			continue
		}

		if _, found := n.GetAnnotations()[filters.LocalConfigAnnotation]; !found {
			objs = append(objs, *u)
		}
	}

	return setNamespaces(r.Mapper, objs, r.Namespace, r.EnforceNamespace)
}
