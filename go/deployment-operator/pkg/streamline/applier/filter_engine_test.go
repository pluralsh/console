package applier

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

func TestFilterEngine(t *testing.T) {
	t.Run("should match when all filters pass", func(t *testing.T) {
		engine := NewFilterEngine()

		// Add filters that always return true
		engine.Add("test1", func(obj unstructured.Unstructured) bool { return true })
		engine.Add("test2", func(obj unstructured.Unstructured) bool { return true })

		obj := unstructured.Unstructured{}
		result := engine.Match(obj)
		assert.True(t, result)
	})

	t.Run("should not match when any filter fails", func(t *testing.T) {
		engine := NewFilterEngine()

		// Add filters where one returns false
		engine.Add("test1", func(obj unstructured.Unstructured) bool { return true })
		engine.Add("test2", func(obj unstructured.Unstructured) bool { return false })
		engine.Add("test3", func(obj unstructured.Unstructured) bool { return true })

		obj := unstructured.Unstructured{}
		result := engine.Match(obj)
		assert.False(t, result)
	})

	t.Run("should match when no filters are added", func(t *testing.T) {
		engine := NewFilterEngine()

		obj := unstructured.Unstructured{}
		result := engine.Match(obj)
		assert.True(t, result)
	})
}
