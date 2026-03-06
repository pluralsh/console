package algorithms

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestDFS(t *testing.T) {
	res := []int{}
	neighbors := func(v int) ([]int, error) {
		if v == 1 {
			return []int{2, 3}, nil
		}
		if v == 2 {
			return []int{4}, nil
		}
		return []int{}, nil
	}
	visit := func(v int) error {
		res = append(res, v)
		return nil
	}

	_ = DFS(1, neighbors, visit)
	assert.Equal(t, res, []int{1, 2, 4, 3})
}

func TestBFS(t *testing.T) {
	res := []int{}
	neighbors := func(v int) ([]int, error) {
		if v == 1 {
			return []int{2, 3}, nil
		}
		if v == 3 {
			return []int{4}, nil
		}
		return []int{}, nil
	}
	visit := func(v int) error {
		res = append(res, v)
		return nil
	}

	_ = BFS(1, neighbors, visit)
	assert.Equal(t, res, []int{1, 2, 3, 4})
}

func TestTopsort(t *testing.T) {
	graph := map[int][]int{
		1: []int{2, 3, 5},
		2: []int{4},
		3: []int{5},
		4: []int{3},
		7: []int{8, 9},
		8: []int{9},
	}
	neighbors := func(v int) ([]int, error) {
		ns, ok := graph[v]
		if !ok {
			return []int{}, nil
		}
		return ns, nil
	}

	sorted, err := TopSort([]int{1, 2, 3, 4, 5, 7, 8, 9}, neighbors)
	assert.NoError(t, err)
	assert.Equal(t, sorted, []int{7, 8, 9, 1, 2, 4, 3, 5})
}
