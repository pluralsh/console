package containers

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestLooksLikeASet(t *testing.T) {
	s := NewSet[int]()

	assert.False(t, s.Has(1), false)
	s.Add(1)
	assert.True(t, s.Has(1))
	s.Add(1)
	s.Add(2)
	assert.True(t, s.Has(2))
	s.Remove(1)
	assert.False(t, s.Has(1))
	assert.Equal(t, s.List(), []int{2})
}

func TestToSet(t *testing.T) {
	vals := []int{1, 2, 5}
	s := ToSet(vals)

	for _, v := range vals {
		assert.True(t, s.Has(v))
	}

	assert.False(t, s.Has(3))
}

func TestEqual(t *testing.T) {
	vals := []int{1, 2, 3}
	s := ToSet(vals)

	assert.True(t, s.Equal(ToSet(vals)))
	assert.False(t, s.Equal(ToSet([]int{1, 2})))
	assert.False(t, s.Equal(ToSet([]int{1, 2, 3, 4})))
	assert.False(t, s.Equal(ToSet([]int{1, 2, 5})))
}

func TestDifference(t *testing.T) {
	s := ToSet([]int{1, 3, 5})
	o := ToSet([]int{2, 3, 5})
	diff := s.Difference(o)

	assert.True(t, diff.Equal(ToSet([]int{1})))
}

func TestUnion(t *testing.T) {
	s := ToSet([]int{1, 3, 5})
	o := ToSet([]int{2, 3, 5})
	un := s.Union(o)

	assert.True(t, un.Equal(ToSet([]int{1, 2, 3, 5})))
}

func TestUnionVariadic(t *testing.T) {
	s := ToSet([]int{1, 3, 5})
	o := ToSet([]int{2, 3, 5})
	p := ToSet([]int{6, 7})
	un := Union(s, o, p)

	assert.True(t, un.Equal(ToSet([]int{1, 2, 3, 5, 6, 7})))
}

func TestIntersect(t *testing.T) {
	s := ToSet([]int{1, 3, 5})
	o := ToSet([]int{2, 3, 5})
	in := s.Intersect(o)

	assert.True(t, in.Equal(ToSet([]int{3, 5})))
}

func TestIntersectVariadic(t *testing.T) {
	s := ToSet([]int{1, 3, 5})
	o := ToSet([]int{2, 3, 5})
	p := ToSet([]int{3, 6, 7})
	in := Intersect(s, o, p)

	assert.True(t, in.Equal(ToSet([]int{3})))
}

func TestSymmetricDifference(t *testing.T) {
	s := ToSet([]int{1, 3, 5})
	o := ToSet([]int{2, 3, 5})
	sd := s.SymmetricDifference(o)

	assert.True(t, sd.Equal(ToSet([]int{1, 2})))
}
