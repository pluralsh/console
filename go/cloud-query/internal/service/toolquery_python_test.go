package service

import (
	"context"
	"errors"
	"os"
	"strings"
	"testing"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
	pythontools "github.com/pluralsh/console/go/cloud-query/internal/tools/python"
)

func TestMain(m *testing.M) {
	if len(os.Args) == 2 && os.Args[1] == "python-worker" {
		if err := pythontools.NewWorker().Run(os.Stdin, os.Stdout); err != nil {
			os.Exit(1)
		}

		os.Exit(0)
	}

	os.Exit(m.Run())
}

type failingPythonRunner struct{ err error }

func (r failingPythonRunner) Run(context.Context, pythontools.RunInput) (*pythontools.RunOutput, error) {
	return nil, r.err
}

func (failingPythonRunner) CloseContext(context.Context) error { return nil }

func TestRunPythonValidatesInput(t *testing.T) {
	server := &ToolQueryService{python: failingPythonRunner{err: errors.New("runner must not be called")}}

	if _, err := server.RunPython(context.Background(), nil); status.Code(err) != codes.InvalidArgument {
		t.Fatalf("nil input code = %s, want %s", status.Code(err), codes.InvalidArgument)
	}
}

func TestRunPythonHidesInternalCause(t *testing.T) {
	server := &ToolQueryService{python: failingPythonRunner{err: errors.New("private process detail")}}

	_, err := server.RunPython(context.Background(), &toolquery.RunPythonInput{Script: "output = {}"})
	if got := status.Convert(err).Message(); got != "python runtime failed" {
		t.Fatalf("RunPython() message = %q, want safe summary", got)
	}
}

func TestRunPythonPreservesSandboxErrorMessage(t *testing.T) {
	runner, err := pythontools.NewRunner(context.Background(), pythontools.RunnerConfig{
		Workers:                        1,
		QueueSize:                      1,
		MaxSuccessfulRunsBeforeRecycle: 1,
	})
	if err != nil {
		t.Fatal(err)
	}
	defer runner.CloseContext(context.Background())

	server := &ToolQueryService{python: runner}
	_, err = server.RunPython(context.Background(), &toolquery.RunPythonInput{
		Script: "import socket\nsocket.create_connection(('example.com', 443))\noutput = {'reachable': True}",
	})

	got := status.Convert(err)
	if got.Code() != codes.FailedPrecondition {
		t.Fatalf("status code = %s", got.Code())
	}
	if !strings.Contains(strings.ToLower(got.Message()), "socket") {
		t.Fatalf("status message = %q", got.Message())
	}
}
