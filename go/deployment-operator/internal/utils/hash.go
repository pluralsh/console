package utils

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

func HashObject(object any) (string, error) {
	out, err := json.Marshal(object)
	if err != nil {
		return "", err
	}
	sha := sha256.Sum256(out)
	return base64.RawURLEncoding.EncodeToString(sha[:]), nil
}

// HashResource calculates SHA for an unstructured resource.
// It uses object metadata (name, namespace, labels, annotations, deletion timestamp)
// and all other top-level fields except status.
func HashResource(resource unstructured.Unstructured) (string, error) {
	resourceCopy := resource.DeepCopy()
	object := struct {
		Name              string            `json:"name"`
		Namespace         string            `json:"namespace"`
		Labels            map[string]string `json:"labels"`
		Annotations       map[string]string `json:"annotations"`
		DeletionTimestamp string            `json:"deletionTimestamp"`
		Other             map[string]any    `json:"other"`
	}{
		Name:        resourceCopy.GetName(),
		Namespace:   resourceCopy.GetNamespace(),
		Labels:      resourceCopy.GetLabels(),
		Annotations: resourceCopy.GetAnnotations(),
	}

	deletionTimestamp := resourceCopy.GetDeletionTimestamp()
	if deletionTimestamp != nil {
		object.DeletionTimestamp = deletionTimestamp.String()
	}

	unstructured.RemoveNestedField(resourceCopy.Object, "metadata")
	unstructured.RemoveNestedField(resourceCopy.Object, "status")
	object.Other = resourceCopy.Object

	return HashObject(object)
}
