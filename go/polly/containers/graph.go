package containers

import (
	"github.com/samber/lo"
)

type Graph[K comparable] map[K][]K

func NewGraph[K comparable]() Graph[K] {
	return make(map[K][]K)
}

func (g Graph[K]) AddEdge(from, to K) {
	g.AddNode(from)
	g.AddNode(to)
	g[from] = append(g[from], to)
}

func (g Graph[K]) AddNode(n K) {
	if _, ok := g[n]; !ok {
		g[n] = make([]K, 0)
	}
}

func (g Graph[K]) Neighbors(from K) []K {
	return g[from]
}

func (g Graph[K]) Nodes() []K {
	return lo.Keys(g)
}
