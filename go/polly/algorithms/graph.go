package algorithms

import "github.com/pluralsh/polly/containers"

type Prober[T any] interface {
	Push(val T)
	Pop() (T, error)
	Empty() bool
}

func ProbeGraph[T comparable](prober Prober[T], initial T, neighbors func(T) ([]T, error), visit func(T) error) error {
	seen := map[T]bool{}
	prober.Push(initial)

	for !prober.Empty() {
		r, err := prober.Pop()
		if err != nil {
			return err
		}

		if _, ok := seen[r]; ok {
			continue
		}

		seen[r] = true
		if err := visit(r); err != nil {
			return err
		}

		nebs, err := neighbors(r)
		if err != nil {
			return err
		}

		for _, neb := range nebs {
			if _, ok := seen[neb]; !ok {
				prober.Push(neb)
			}
		}
	}

	return nil
}

func DFS[T comparable](initial T, neighbors func(T) ([]T, error), visit func(T) error) error {
	s := containers.NewStack[T]()
	wrapped := func(n T) (ns []T, err error) {
		ns, err = neighbors(n)
		if err != nil {
			return
		}
		ns = Reverse(ns)
		return
	}

	return ProbeGraph[T](s, initial, wrapped, visit)
}

func BFS[T comparable](initial T, neighbors func(T) ([]T, error), visit func(T) error) error {
	q := containers.NewQueue[T]()
	return ProbeGraph[T](q, initial, neighbors, visit)
}

func TopSort[T comparable](vals []T, neighbors func(T) ([]T, error)) ([]T, error) {
	marked := map[T]bool{}
	s := containers.NewStack[T]()
	for _, v := range vals {
		if !marked[v] {
			if err := topsort(v, marked, neighbors, s); err != nil {
				return []T{}, err
			}
		}
	}

	return s.List(), nil
}

func topsort[T comparable](v T, visited map[T]bool, neighbors func(T) ([]T, error), res *containers.Stack[T]) (err error) {
	if visited[v] {
		return
	}
	visited[v] = true

	nebs, err := neighbors(v)
	if err != nil {
		return
	}

	for _, neb := range nebs {
		if !visited[neb] {
			if err := topsort(neb, visited, neighbors, res); err != nil {
				return err
			}
		}
	}

	res.Push(v)
	return
}

func TopsortGraph[T comparable](g containers.Graph[T]) ([]T, error) {
	return TopSort[T](g.Nodes(), func(n T) ([]T, error) {
		return g.Neighbors(n), nil
	})
}
