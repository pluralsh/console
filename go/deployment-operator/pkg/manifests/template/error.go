package template

import (
	"fmt"
	"strings"

	"k8s.io/apimachinery/pkg/runtime/schema"
)

// UnknownTypeError captures information about a type for which no information
// could be found in the cluster or among the known CRDs.
type UnknownTypeError struct {
	GroupVersionKind schema.GroupVersionKind
}

func (e *UnknownTypeError) Error() string {
	return fmt.Sprintf("unknown resource type: %q", e.GroupVersionKind.String())
}

func (e *NamespaceMismatchError) Error() string {
	return fmt.Sprintf("found namespace %q, but all resources must be in namespace %q",
		e.Namespace, e.RequiredNamespace)
}

// UnknownTypesError captures information about unknown types encountered.
type UnknownTypesError struct {
	GroupVersionKinds []schema.GroupVersionKind
}

// NamespaceMismatchError is returned if all resources must be in a specific
// namespace, and resources are found using other namespaces.
type NamespaceMismatchError struct {
	RequiredNamespace string
	Namespace         string
}

func (e *UnknownTypesError) Error() string {
	gvks := make([]string, 0, len(e.GroupVersionKinds))
	for _, gvk := range e.GroupVersionKinds {
		gvks = append(gvks, fmt.Sprintf("%s/%s/%s",
			gvk.Group, gvk.Version, gvk.Kind))
	}
	return fmt.Sprintf("unknown resource types: %s", strings.Join(gvks, ","))
}
