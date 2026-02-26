package rpc

import (
	"testing"

	"google.golang.org/genproto/googleapis/rpc/status"

	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/testhelpers"
)

func TestValidation_Valid(t *testing.T) {
	tests := []testhelpers.ValidTestcase{
		{
			Name: "minimal",
			Valid: &Error{
				Status: &status.Status{},
			},
		},
	}
	testhelpers.AssertValid(t, tests)
}

func TestValidation_Invalid(t *testing.T) {
	tests := []testhelpers.InvalidTestcase{
		{
			ErrString: "invalid Error.Status: value is required",
			Invalid:   &Error{},
		},
	}
	testhelpers.AssertInvalid(t, tests)
}
