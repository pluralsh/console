package service

import (
	"context"
	"testing"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
	pythontools "github.com/pluralsh/console/go/cloud-query/internal/tools/python"
)

func TestRunPythonValidatesInputAndAvailability(t *testing.T) {
	server := &ToolQueryService{}

	if _, err := server.RunPython(context.Background(), nil); status.Code(err) != codes.InvalidArgument {
		t.Fatalf("nil input code = %s, want %s", status.Code(err), codes.InvalidArgument)
	}
	if _, err := server.RunPython(context.Background(), &toolquery.RunPythonInput{Script: "output = {}"}); status.Code(err) != codes.Unavailable {
		t.Fatalf("missing runner code = %s, want %s", status.Code(err), codes.Unavailable)
	}
}

func TestPythonGRPCCode(t *testing.T) {
	for runCode, want := range map[pythontools.Code]codes.Code{
		pythontools.InvalidArgument:    codes.InvalidArgument,
		pythontools.FailedPrecondition: codes.FailedPrecondition,
		pythontools.Canceled:           codes.Canceled,
		pythontools.DeadlineExceeded:   codes.DeadlineExceeded,
		pythontools.ResourceExhausted:  codes.ResourceExhausted,
		pythontools.Unavailable:        codes.Unavailable,
		pythontools.Internal:           codes.Internal,
	} {
		err := &pythontools.Error{Code: runCode, Msg: "safe"}
		if got := pythonGRPCCode(err); got != want {
			t.Errorf("pythonGRPCCode(%s) = %s, want %s", runCode, got, want)
		}
	}
}
