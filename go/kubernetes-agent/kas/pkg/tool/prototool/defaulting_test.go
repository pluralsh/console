package prototool

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"google.golang.org/protobuf/types/known/durationpb"
)

func TestNotNil(t *testing.T) {
	var x struct {
		Bla *durationpb.Duration // an example proto field
	}
	NotNil(&x.Bla)
	assert.NotNil(t, x.Bla)
}

func TestStringPtr(t *testing.T) {
	var x struct {
		Bla *string // an example proto field
	}
	StringPtr(&x.Bla, "foo")
	assert.NotNil(t, x.Bla)
	assert.Equal(t, "foo", *x.Bla)
}
