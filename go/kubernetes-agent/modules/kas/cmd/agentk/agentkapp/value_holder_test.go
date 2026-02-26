package agentkapp

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValueHolder_GetReturnsAfterSet(t *testing.T) {
	h := NewValueHolder[int64]()
	require.NoError(t, h.set(1))
	id, err := h.get(context.Background())
	require.NoError(t, err)
	assert.EqualValues(t, 1, id)
}

func TestValueHolder_TryGetReturnsAfterSet(t *testing.T) {
	h := NewValueHolder[int64]()
	_, ok := h.tryGet()
	require.False(t, ok)
	require.NoError(t, h.set(1))
	id, ok := h.tryGet()
	require.True(t, ok)
	assert.EqualValues(t, 1, id)
}

func TestValueHolder_GetReturnsAfterConcurrentSet(t *testing.T) {
	h := NewValueHolder[int64]()
	go func() {
		assert.NoError(t, h.set(1))
	}()
	id, err := h.get(context.Background())
	require.NoError(t, err)
	assert.EqualValues(t, 1, id)
}

func TestValueHolder_GetTimesOut(t *testing.T) {
	h := NewValueHolder[int64]()
	ctx, cancel := context.WithTimeout(context.Background(), time.Millisecond)
	defer cancel()
	_, err := h.get(ctx)
	assert.Equal(t, context.DeadlineExceeded, err)
}

func TestValueHolder_SetReturnsNoErrorOnSameId(t *testing.T) {
	h := NewValueHolder[int64]()
	require.NoError(t, h.set(1))
	assert.NoError(t, h.set(1))
}

func TestValueHolder_SetReturnsErrorOnDifferentId(t *testing.T) {
	h := NewValueHolder[int64]()
	require.NoError(t, h.set(1))
	assert.EqualError(t, h.set(2), "value is already set to a different value: old 1, new 2")
}
