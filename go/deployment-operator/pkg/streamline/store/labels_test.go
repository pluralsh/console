package store

import (
	"testing"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

func TestEncodeDecodeComponentLabels(t *testing.T) {
	t.Run("nil labels round-trip to empty map", func(t *testing.T) {
		encoded, err := encodeComponentLabels(unstructured.Unstructured{})
		if err != nil {
			t.Fatalf("encode: %v", err)
		}
		if encoded != "{}" {
			t.Fatalf("expected {}, got %q", encoded)
		}

		decoded, err := decodeComponentLabels(encoded)
		if err != nil {
			t.Fatalf("decode: %v", err)
		}
		if len(decoded) != 0 {
			t.Fatalf("expected empty map, got %#v", decoded)
		}
	})

	t.Run("empty and null stored values decode to empty map", func(t *testing.T) {
		for _, raw := range []string{"", "null"} {
			decoded, err := decodeComponentLabels(raw)
			if err != nil {
				t.Fatalf("decode %q: %v", raw, err)
			}
			if len(decoded) != 0 {
				t.Fatalf("decode %q: expected empty map, got %#v", raw, decoded)
			}
		}
	})

	t.Run("labels with quotes round-trip", func(t *testing.T) {
		obj := unstructured.Unstructured{}
		obj.SetLabels(map[string]string{"quoted": `foo's "bar"`})

		encoded, err := encodeComponentLabels(obj)
		if err != nil {
			t.Fatalf("encode: %v", err)
		}

		decoded, err := decodeComponentLabels(encoded)
		if err != nil {
			t.Fatalf("decode: %v", err)
		}
		if decoded["quoted"] != `foo's "bar"` {
			t.Fatalf("unexpected labels: %#v", decoded)
		}
	})
}
