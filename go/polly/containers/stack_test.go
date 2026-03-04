package containers

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestLooksLikeAStack(t *testing.T) {
	s := NewStack[int]()
	s.Push(1)
	s.Push(3)
	s.Push(2)

	len := s.Len()
	assert.Equal(t, len, 3)

	for _, expected := range []int{2, 3, 1} {
		v, err := s.Pop()
		len -= 1
		assert.NoError(t, err)
		assert.Equal(t, v, expected)
		assert.Equal(t, s.Len(), len)
	}

	assert.True(t, s.Empty())
}

func TestStackToList(t *testing.T) {
	s := NewStack[int]()
	s.Push(1)
	s.Push(3)
	s.Push(2)

	assert.Equal(t, s.List(), []int{2, 3, 1})
	_, _ = s.Pop()
	assert.Equal(t, s.List(), []int{3, 1})
	_, _ = s.Pop()
	assert.Equal(t, s.List(), []int{1})
}
