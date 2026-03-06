package containers

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestLooksLikeAQueue(t *testing.T) {
	q := NewQueue[int]()
	q.Push(1)
	q.Push(3)
	q.Push(2)

	len := q.Len()
	assert.Equal(t, len, 3)

	for _, expected := range []int{1, 3, 2} {
		v, err := q.Pop()
		len -= 1
		assert.NoError(t, err)
		assert.Equal(t, v, expected)
		assert.Equal(t, q.Len(), len)
	}

	assert.True(t, q.Empty())
}
