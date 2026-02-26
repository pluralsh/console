package syncz

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestStriped_Init(t *testing.T) {
	var c int32
	v := NewStripedValueInit(4, func() int32 {
		c++
		return c
	})

	for i, val := range v.Stripes {
		assert.EqualValues(t, i+1, val) // i starts from 0, values start from 1
	}
}

func TestStriped_GetPointer(t *testing.T) {
	var c int32
	v := NewStripedValueInit(2, func() int32 { // 2 bits is 4 stripes
		c++
		return c
	})

	assert.EqualValues(t, 1, *v.GetPointer(0))
	assert.EqualValues(t, 2, *v.GetPointer(1))
	assert.EqualValues(t, 3, *v.GetPointer(2))
	assert.EqualValues(t, 4, *v.GetPointer(3))
	// cycle
	assert.EqualValues(t, 1, *v.GetPointer(4))
	assert.EqualValues(t, 2, *v.GetPointer(5))
	assert.EqualValues(t, 3, *v.GetPointer(6))
	assert.EqualValues(t, 4, *v.GetPointer(7))
}
