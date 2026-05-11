package template

import (
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/util/validation/field"
	"k8s.io/klog/v2"
	"sigs.k8s.io/kustomize/kyaml/kio/kioutil"
	"sigs.k8s.io/kustomize/kyaml/yaml"

	"github.com/pluralsh/deployment-operator/pkg/log"
)

var (
	crdGK = schema.GroupKind{Group: "apiextensions.k8s.io", Kind: "CustomResourceDefinition"}
)

func setNamespaces(mapper meta.RESTMapper, objs []unstructured.Unstructured,
	defaultNamespace string, enforceNamespace bool) ([]unstructured.Unstructured, error) {
	// find any crds in the set of resources.
	crdObjs := make([]unstructured.Unstructured, 0, len(objs))
	for _, obj := range objs {
		if IsCRD(&obj) {
			crdObjs = append(crdObjs, obj)
		}
	}

	var unknownGVKs []schema.GroupVersionKind
	for i := range objs {
		gvk := objs[i].GroupVersionKind()
		if namespacedCache.Present(gvk) {
			if namespacedCache.Namespaced(gvk) && objs[i].GetNamespace() == "" {
				objs[i].SetNamespace(defaultNamespace)
			}

			if !namespacedCache.Namespaced(gvk) && objs[i].GetNamespace() != "" {
				objs[i].SetNamespace("")
			}
			continue
		}

		// Look up the scope of the resource so we know if the resource
		// should have a namespace set or not.
		scope, err := LookupResourceScope(&objs[i], lo.ToSlicePtr(crdObjs), mapper)
		if err != nil {
			var unknownTypeError *UnknownTypeError
			if errors.As(err, &unknownTypeError) {
				// If no scope was found, just add the resource type to the list
				// of unknown types.
				unknownGVKs = append(unknownGVKs, unknownTypeError.GroupVersionKind)
				continue
			}
			// If something went wrong when looking up the scope, just
			// give up.
			return nil, err
		}

		switch scope {
		case meta.RESTScopeNamespace:
			if objs[i].GetNamespace() == "" {
				objs[i].SetNamespace(defaultNamespace)
			} else {
				ns := objs[i].GetNamespace()
				if enforceNamespace && ns != defaultNamespace {
					return nil, &NamespaceMismatchError{
						Namespace:         ns,
						RequiredNamespace: defaultNamespace,
					}
				}
			}
			namespacedCache.Store(gvk, true)
		case meta.RESTScopeRoot:
			if ns := objs[i].GetNamespace(); ns != "" {
				objs[i].SetNamespace("")
				klog.V(log.LogLevelExtended).InfoS("Found resource with namespace", "namespace", ns, "resource", objs[i].GetName(), "gvk", objs[i].GroupVersionKind(), "error", "coerced to un-namespaced")
			}
			namespacedCache.Store(gvk, false)
		default:
			return nil, fmt.Errorf("unknown RESTScope %q", scope.Name())
		}
	}

	if len(unknownGVKs) > 0 {
		err := &UnknownTypesError{
			GroupVersionKinds: unknownGVKs,
		}
		klog.V(log.LogLevelExtended).InfoS("found unknown types", "types", err.GroupVersionKinds, "error", err)
	}

	return objs, nil
}

// KyamlNodeToUnstructured take a resource represented as a kyaml RNode and
// turns it into an Unstructured object.
func KyamlNodeToUnstructured(n *yaml.RNode) (*unstructured.Unstructured, error) {
	b, err := n.MarshalJSON()
	if err != nil {
		return nil, err
	}

	var m map[string]interface{}
	err = json.Unmarshal(b, &m)
	if err != nil {
		return nil, err
	}

	return &unstructured.Unstructured{
		Object: m,
	}, nil
}

// RemoveAnnotations removes the specified kioutil annotations from the resource.
func RemoveAnnotations(n *yaml.RNode, annotations ...kioutil.AnnotationKey) error {
	for _, a := range annotations {
		err := n.PipeE(yaml.ClearAnnotation(a))
		if err != nil {
			return err
		}
	}
	return nil
}

// IsCRD returns true if the passed Unstructured object has
// GroupKind == Extensions/CustomResourceDefinition; false otherwise.
func IsCRD(u *unstructured.Unstructured) bool {
	if u == nil {
		return false
	}
	gvk := u.GroupVersionKind()
	return crdGK == gvk.GroupKind()
}

// LookupResourceScope tries to look up the scope of the type of the provided
// resource, looking at both the types known to the cluster (through the
// RESTMapper) and the provided CRDs. If no information about the type can
// be found, an UnknownTypeError wil be returned.
func LookupResourceScope(u *unstructured.Unstructured, crds []*unstructured.Unstructured, mapper meta.RESTMapper) (meta.RESTScope, error) {
	gvk := u.GroupVersionKind()
	// First see if we can find the type (and the scope) in the cluster through
	// the RESTMapper.
	mapping, err := mapper.RESTMapping(gvk.GroupKind(), gvk.Version)
	if err == nil {
		// If we find the type in the cluster, we just look up the scope there.
		return mapping.Scope, nil
	}
	// Not finding a match is not an error here, so only error out for other
	// error types.
	if !meta.IsNoMatchError(err) {
		return nil, err
	}

	// If we couldn't find the type in the cluster, check if we find a
	// match in any of the provided CRDs.
	for _, crd := range crds {
		group, found, err := NestedField(crd.Object, "spec", "group")
		if err != nil {
			return nil, err
		}
		if !found || group == "" {
			return nil, NotFound([]interface{}{"spec", "group"}, group)
		}
		kind, found, err := NestedField(crd.Object, "spec", "names", "kind")
		if err != nil {
			return nil, err
		}
		if !found || kind == "" {
			return nil, NotFound([]interface{}{"spec", "kind"}, group)
		}
		if gvk.Kind != kind || gvk.Group != group {
			continue
		}
		versionDefined, err := crdDefinesVersion(crd, gvk.Version)
		if err != nil {
			return nil, err
		}
		if !versionDefined {
			return nil, &UnknownTypeError{
				GroupVersionKind: gvk,
			}
		}
		scopeName, _, err := NestedField(crd.Object, "spec", "scope")
		if err != nil {
			return nil, err
		}
		switch scopeName {
		case "Namespaced":
			return meta.RESTScopeNamespace, nil
		case "Cluster":
			return meta.RESTScopeRoot, nil
		default:
			return nil, Invalid([]interface{}{"spec", "scope"}, scopeName,
				"expected Namespaced or Cluster")
		}
	}
	return nil, &UnknownTypeError{
		GroupVersionKind: gvk,
	}
}

func crdDefinesVersion(crd *unstructured.Unstructured, version string) (bool, error) {
	versions, found, err := NestedField(crd.Object, "spec", "versions")
	if err != nil {
		return false, err
	}
	if !found {
		return false, NotFound([]interface{}{"spec", "versions"}, versions)
	}
	versionsSlice, ok := versions.([]interface{})
	if !ok {
		return false, InvalidType([]interface{}{"spec", "versions"}, versions, "[]interface{}")
	}
	if len(versionsSlice) == 0 {
		return false, Invalid([]interface{}{"spec", "versions"}, versionsSlice, "must not be empty")
	}
	for i := range versionsSlice {
		name, found, err := NestedField(crd.Object, "spec", "versions", i, "name")
		if err != nil {
			return false, err
		}
		if !found {
			return false, NotFound([]interface{}{"spec", "versions", i, "name"}, name)
		}
		if name == version {
			return true, nil
		}
	}
	return false, nil
}

// NestedField gets a value from a KRM map, if it exists, otherwise nil.
// Fields can be string (map key) or int (array index).
func NestedField(obj map[string]interface{}, fields ...interface{}) (interface{}, bool, error) {
	var val interface{} = obj

	for i, field := range fields {
		if val == nil {
			return nil, false, nil
		}
		switch typedField := field.(type) {
		case string:
			if m, ok := val.(map[string]interface{}); ok {
				val, ok = m[typedField]
				if !ok {
					// not in map
					return nil, false, nil
				}
			} else {
				return nil, false, InvalidType(fields[:i+1], val, "map[string]interface{}")
			}
		case int:
			if s, ok := val.([]interface{}); ok {
				if typedField >= len(s) {
					// index out of range
					return nil, false, nil
				}
				val = s[typedField]
			} else {
				return nil, false, InvalidType(fields[:i+1], val, "[]interface{}")
			}
		default:
			return nil, false, InvalidType(fields[:i+1], val, "string or int")
		}
	}
	return val, true, nil
}

// InvalidType returns a *Error indicating "invalid value type".  This is used
// to report malformed values (e.g. found int, expected string).
func InvalidType(fieldPath []interface{}, value interface{}, validTypes string) *field.Error {
	return Invalid(fieldPath, value,
		fmt.Sprintf("found type %T, expected %s", value, validTypes))
}

// Invalid returns a *Error indicating "invalid value".  This is used
// to report malformed values (e.g. failed regex match, too long, out of bounds).
func Invalid(fieldPath []interface{}, value interface{}, detail string) *field.Error {
	return &field.Error{
		Type:     field.ErrorTypeInvalid,
		Field:    FieldPath(fieldPath),
		BadValue: value,
		Detail:   detail,
	}
}

// NotFound returns a *Error indicating "value not found".  This is
// used to report failure to find a requested value (e.g. looking up an ID).
func NotFound(fieldPath []interface{}, value interface{}) *field.Error {
	return &field.Error{
		Type:     field.ErrorTypeNotFound,
		Field:    FieldPath(fieldPath),
		BadValue: value,
		Detail:   "",
	}
}

// FieldPath formats a list of KRM field keys as a JSONPath expression.
// The only valid field keys in KRM are strings (map keys) and ints (list keys).
// Simple strings (see isSimpleString) will be delimited with a period.
// Complex strings will be wrapped with square brackets and double quotes.
// Integers will be wrapped with square brackets.
// All other types will be formatted best-effort within square brackets.
func FieldPath(fieldPath []interface{}) string {
	var sb strings.Builder
	for _, field := range fieldPath {
		switch typedField := field.(type) {
		case string:
			if isSimpleString(typedField) {
				_, _ = fmt.Fprintf(&sb, ".%s", typedField)
			} else {
				_, _ = fmt.Fprintf(&sb, "[%q]", typedField)
			}
		case int:
			_, _ = fmt.Fprintf(&sb, "[%d]", typedField)
		default:
			// invalid type. try anyway...
			_, _ = fmt.Fprintf(&sb, "[%#v]", typedField)
		}
	}
	return sb.String()
}

var simpleStringRegex = regexp.MustCompile(`^[a-zA-Z]([a-zA-Z0-9_-]*[a-zA-Z0-9])?$`)

// isSimpleString returns true if the input follows the following rules:
// - contains only alphanumeric characters, '_' or '-'
// - starts with an alphabetic character
// - ends with an alphanumeric character
func isSimpleString(s string) bool {
	return simpleStringRegex.FindString(s) != ""
}
