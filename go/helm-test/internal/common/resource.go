package common

import (
	"io"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/klog/v2"
	"sigs.k8s.io/cli-utils/pkg/manifestreader"
	"sigs.k8s.io/cli-utils/pkg/object"
	"sigs.k8s.io/kustomize/kyaml/kio"
	"sigs.k8s.io/kustomize/kyaml/kio/kioutil"
)

// fromManifestsReader reads the manifests from raw reader and returns them as unstructured objects.
func fromManifestsReader(reader io.Reader) ([]*unstructured.Unstructured, error) {
	result := make([]*unstructured.Unstructured, 0)
	nodes, err := (&kio.ByteReader{
		Reader: reader,
	}).Read()
	if err != nil {
		return result, err
	}

	for _, n := range nodes {
		err = manifestreader.RemoveAnnotations(n, kioutil.IndexAnnotation)
		if err != nil {
			return result, err
		}
		u, err := manifestreader.KyamlNodeToUnstructured(n)
		if err != nil {
			return result, err
		}
		result = append(result, u)
	}

	result = manifestreader.FilterLocalConfig(result)
	return result, err
}

type ManifestMap map[string]*unstructured.Unstructured
type ManifestKey object.ObjMetadata

func (in ManifestKey) ObjMetadata() object.ObjMetadata {
	return object.ObjMetadata(in)
}

func (in ManifestKey) String() string {
	return in.ObjMetadata().String()
}

func ManifestKeyFromUnstructured(obj *unstructured.Unstructured) ManifestKey {
	if obj == nil {
		return ManifestKey(object.NilObjMetadata)
	}

	return ManifestKey(object.UnstructuredToObjMetadata(obj))
}

func ManifestKeyFromString(key string) (ManifestKey, error) {
	objMetadata, err := object.ParseObjMetadata(key)
	return ManifestKey(objMetadata), err
}

func NewManifestMap(manifests []*unstructured.Unstructured) (ManifestMap, error) {
	result := make(map[string]*unstructured.Unstructured)

	for _, manifest := range manifests {
		key := ManifestKeyFromUnstructured(manifest)
		if _, exists := result[key.String()]; exists {
			klog.ErrorS(nil, "ManifestMap found duplicated manifest", "key", key.String())
			continue
		}

		result[key.String()] = manifest
	}

	return result, nil
}
