package errz

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
)

var (
	_ error = UserError{}
)

func Test_UserError_Unwrap(t *testing.T) {
	e := UserError{
		Cause:   context.Canceled,
		Message: "bla",
	}
	assert.Equal(t, context.Canceled, e.Unwrap())
	assert.True(t, errors.Is(e, context.Canceled))
}

func Test_UserError_String(t *testing.T) {
	t.Run("without id", func(t *testing.T) {
		e := UserError{
			Message: "bla",
		}
		assert.EqualError(t, e, "bla")
	})
	t.Run("with id", func(t *testing.T) {
		e := UserError{
			Cause:   context.Canceled,
			Message: "bla",
		}
		assert.EqualError(t, e, "bla: context canceled")
	})
}
