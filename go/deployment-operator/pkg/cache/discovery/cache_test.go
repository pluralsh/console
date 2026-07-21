package discovery

import (
	"sync/atomic"
	"testing"

	"github.com/stretchr/testify/assert"
	"k8s.io/apimachinery/pkg/api/meta"
)

type resettableMapper struct {
	meta.RESTMapper
	resetCalls atomic.Int32
}

func (in *resettableMapper) Reset() {
	in.resetCalls.Add(1)
}

func TestResetRESTMapper(t *testing.T) {
	t.Run("delegates to resettable mapper", func(t *testing.T) {
		mapper := &resettableMapper{}
		cache := NewCache(nil, mapper)

		cache.ResetRESTMapper()

		assert.Equal(t, int32(1), mapper.resetCalls.Load())
	})

	t.Run("ignores missing mapper", func(t *testing.T) {
		cache := NewCache(nil, nil)
		assert.NotPanics(t, cache.ResetRESTMapper)
	})
}
