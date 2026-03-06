package containers

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestLooksLikeAGraph(t *testing.T) {
	g := NewGraph[int]()
	g.AddEdge(1, 2)

	assert.Equal(t, g.Neighbors(1), []int{2})

	g.AddEdge(1, 3)
	g.AddEdge(1, 4)
	g.AddEdge(2, 1)

	assert.Equal(t, g.Neighbors(1), []int{2, 3, 4})
	assert.Equal(t, g.Neighbors(2), []int{1})
	assert.Equal(t, g.Neighbors(3), []int{})

	assert.True(t, ToSet(g.Nodes()).Equal(ToSet([]int{1, 2, 3, 4})))
}
