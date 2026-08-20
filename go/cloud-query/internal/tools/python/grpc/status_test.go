package grpc

import (
	"errors"
	"testing"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/pluralsh/console/go/cloud-query/internal/tools/python"
	"github.com/pluralsh/console/go/cloud-query/internal/tools/python/internal/contract"
)

func TestStatusCode(t *testing.T) {
	for code, want := range map[python.Code]codes.Code{
		python.InvalidArgument:    codes.InvalidArgument,
		python.FailedPrecondition: codes.FailedPrecondition,
		python.Canceled:           codes.Canceled,
		python.DeadlineExceeded:   codes.DeadlineExceeded,
		python.ResourceExhausted:  codes.ResourceExhausted,
		python.Unavailable:        codes.Unavailable,
		python.Internal:           codes.Internal,
	} {
		if got := statusCode(code); got != want {
			t.Errorf("statusCode(%s) = %s, want %s", code, got, want)
		}
	}
}

func TestStatusErrorPreservesPublicMessage(t *testing.T) {
	err := contract.Failed(
		"python ImportError: socket is unavailable",
		errors.New("private sandbox diagnostic"),
	)

	got := status.Convert(StatusError(err))
	if got.Code() != codes.FailedPrecondition {
		t.Fatalf("status code = %s", got.Code())
	}
	if got.Message() != "python ImportError: socket is unavailable" {
		t.Fatalf("status message = %q", got.Message())
	}
}
