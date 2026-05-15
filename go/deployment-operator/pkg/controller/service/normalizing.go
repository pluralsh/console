package service

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"reflect"

	jsonpatch "github.com/evanphx/json-patch/v5"
	"github.com/go-openapi/jsonpointer"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

func IgnoreJSONPaths(obj unstructured.Unstructured, ignorePaths []string) (unstructured.Unstructured, error) {
	ops := make([]map[string]string, 0, len(ignorePaths))
	for _, path := range ignorePaths {
		ops = append(ops, map[string]string{
			"op":   "remove",
			"path": path,
		})
	}

	patchJSON, err := json.Marshal(ops)
	if err != nil {
		return obj, fmt.Errorf("failed to marshal json patch representation: %w", err)
	}

	raw, err := json.Marshal(obj.Object)
	if err != nil {
		return obj, fmt.Errorf("failed to marshal base kubernetes object for patch: %w", err)
	}

	patch, err := jsonpatch.DecodePatch(patchJSON)
	if err != nil {
		return obj, fmt.Errorf("failed to decode json patch object: %w", err)
	}

	modified, err := patch.Apply(raw)
	if err != nil {
		return obj, fmt.Errorf("failed to apply patch: %w", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(modified, &result); err != nil {
		return obj, fmt.Errorf("failed to unmarshal patched object: %w", err)
	}

	obj.Object = result
	return obj, nil
}

func BackFillJSONPaths(ctx context.Context, c client.Client, obj unstructured.Unstructured, ignorePaths []string) (unstructured.Unstructured, error) {
	current := &unstructured.Unstructured{}
	current.SetGroupVersionKind(obj.GroupVersionKind())

	key := types.NamespacedName{
		Name:      obj.GetName(),
		Namespace: obj.GetNamespace(),
	}

	if err := c.Get(ctx, key, current); err != nil {
		if apierrors.IsNotFound(err) {
			return obj, nil // Object doesn't exist, skip
		}
		return unstructured.Unstructured{}, fmt.Errorf("failed to get live object: %w", err)
	}

	// Compare and overwrite ignored paths
	for _, path := range ignorePaths {
		ptr, err := jsonpointer.New(path)
		if err != nil {
			return unstructured.Unstructured{}, fmt.Errorf("invalid JSON pointer %q: %w", path, err)
		}

		liveVal, _, err := ptr.Get(current.Object)
		if err != nil {
			continue // Ignore missing path
		}

		desiredVal, _, err := ptr.Get(obj.Object)
		if err != nil || !flexEqual(liveVal, desiredVal) {
			// Set the desired object's field to the live value
			_, err = ptr.Set(obj.Object, liveVal)
			if err != nil {
				return unstructured.Unstructured{}, fmt.Errorf("failed to set path %s: %w", path, err)
			}
		}
	}

	return obj, nil
}

type normalizerKey struct {
	Kind      string
	Name      string
	Namespace string
	BackFill  bool
}

func matchesKey(obj unstructured.Unstructured, key normalizerKey) (bool, bool) {
	if key.Kind != "" && obj.GetKind() != key.Kind {
		return false, key.BackFill
	}
	if key.Name != "" && obj.GetName() != key.Name {
		return false, key.BackFill
	}
	if key.Namespace != "" && obj.GetNamespace() != key.Namespace {
		return false, key.BackFill
	}
	return true, key.BackFill
}

// flexEqual compares two values with special handling for numeric types.
// This is necessary because JSON unmarshalling (used in Unstructured objects)
// treats all numbers as float64 by default, while Kubernetes API types (like int32/int64)
// retain their original integer type when fetched using controller-runtime's client.
//
// For example:
// - A value like `replicas: 1` from YAML becomes float64(1.0)
// - The same field from the Kubernetes API may be int64(1) or int32(1)
// - reflect.DeepEqual would return false even though they represent the same number
//
// This function ensures such semantically equal numeric values are treated as equal.
func flexEqual(a, b interface{}) bool {
	// Compare numeric types with type coercion
	if isNumber(a) && isNumber(b) {
		af := toFloat64(a)
		bf := toFloat64(b)
		return math.Abs(af-bf) < 1e-9 // tolerate float precision errors
	}

	// Fall back to deep equal
	return reflect.DeepEqual(a, b)
}

func isNumber(v interface{}) bool {
	switch v.(type) {
	case int, int8, int16, int32, int64,
		uint, uint8, uint16, uint32, uint64,
		float32, float64:
		return true
	default:
		return false
	}
}

func toFloat64(v interface{}) float64 {
	switch n := v.(type) {
	case int:
		return float64(n)
	case int8:
		return float64(n)
	case int16:
		return float64(n)
	case int32:
		return float64(n)
	case int64:
		return float64(n)
	case uint:
		return float64(n)
	case uint8:
		return float64(n)
	case uint16:
		return float64(n)
	case uint32:
		return float64(n)
	case uint64:
		return float64(n)
	case float32:
		return float64(n)
	case float64:
		return n
	default:
		return math.NaN()
	}
}
