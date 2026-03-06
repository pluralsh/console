package containers

import (
	"github.com/samber/lo"
)

type Set[V comparable] map[V]bool

// NewSet constructor to create new set
// Example:
// NewSet(int)() to create a int set
// NewSet(string)() to create a string set
func NewSet[V comparable]() Set[V] {
	return map[V]bool{}
}

// ToSet method initializes new Set from slice
// Example:
// input := []string{"a", "b", "c"}
// newSet := ToSet[string](input)
func ToSet[V comparable](vals []V) Set[V] {
	s := NewSet[V]()
	for _, v := range vals {
		s[v] = true
	}

	return s
}

// Add values to set
func (s Set[V]) Add(v V) {
	s[v] = true
}

// Has checks if element exists in set
func (s Set[V]) Has(v V) bool {
	return s[v]
}

// Remove deletes values from set
func (s Set[V]) Remove(v V) {
	delete(s, v)
}

// List returns the contents as a slice
func (s Set[V]) List() []V {
	return lo.Keys(s)
}

// Len return length of set
func (s Set[V]) Len() int {
	return len(s)
}

// Equal returns true if and only if original is equal (as a set) to other.
// Two sets are equal if their membership is identical.
// (In practice, this means same elements, order doesn't matter)
func (s Set[V]) Equal(other Set[V]) bool {
	if s.Len() != other.Len() {
		return false
	}

	for k := range s {
		if !other.Has(k) {
			return false
		}
	}

	return true
}

// Difference returns a set of objects that are not in s2
// For example:
// s1 = {a1, a2, a3}
// s2 = {a1, a2, a4, a5}
// s1.Difference(s2) = {a3}
// s2.Difference(s1) = {a4, a5}
func (s Set[V]) Difference(other Set[V]) Set[V] {
	new := NewSet[V]()
	for v := range s {
		if !other.Has(v) {
			new.Add(v)
		}
	}
	return new
}

// Union returns a new set which includes items in either s1 or s2.
// For example:
// s1 = {a1, a2}
// s2 = {a3, a4}
// s1.Union(s2) = {a1, a2, a3, a4}
// s2.Union(s1) = {a1, a2, a3, a4}
func (s Set[V]) Union(other Set[V]) Set[V] {
	new := ToSet(s.List())
	for v := range other {
		new.Add(v)
	}
	return new
}

func Union[V comparable](sets ...Set[V]) Set[V] {
	res := NewSet[V]()

	// use nested loops for a bit of extra efficiency
	for _, s := range sets {
		for v := range s {
			res.Add(v)
		}
	}

	return res
}

// Intersect returns a new set which includes the item in BOTH s1 and s2
// For example:
// s1 = {a1, a2}
// s2 = {a2, a3}
// s1.Intersect(s2) = {a2}
func (s Set[V]) Intersect(other Set[V]) Set[V] {
	res := NewSet[V]()
	for v := range s {
		if other.Has(v) {
			res.Add(v)
		}
	}

	return res
}

func Intersect[V comparable](sets ...Set[V]) Set[V] {
	res := NewSet[V]()
	if len(sets) == 0 {
		return res
	}
	first, rest := sets[0], sets[1:]
	for v := range first {
		if lo.EveryBy(rest, func(s Set[V]) bool { return s.Has(v) }) {
			res.Add(v)
		}
	}

	return res
}

// SymmetricDifference returns set of elements which are in either of the sets, but not in their intersection
// For example:
// s1 = {a1, a2, a3}
// s2 = {a3, a4}
// s1.SymmetricDifference(s2) = {a1, a2, a4}
func (s Set[V]) SymmetricDifference(other Set[V]) Set[V] {
	un := s.Union(other)
	in := s.Intersect(other)
	return un.Difference(in)
}
