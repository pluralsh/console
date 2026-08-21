package python

import (
	"context"
	"os"
	"strings"
	"testing"
)

func TestMain(m *testing.M) {
	if len(os.Args) == 2 && os.Args[1] == "python-worker" {
		if err := NewWorker().Run(os.Stdin, os.Stdout); err != nil {
			os.Exit(1)
		}
		os.Exit(0)
	}
	os.Exit(m.Run())
}

func TestRunnerSelfSpawnsWorker(t *testing.T) {
	runner, err := NewRunner(context.Background(), RunnerConfig{Workers: 1, QueueSize: 1, MaxSuccessfulRunsBeforeRecycle: 1})
	if err != nil {
		t.Fatal(err)
	}
	defer runner.CloseContext(context.Background())
	output, err := runner.Run(context.Background(), RunInput{Script: "output = {'value': 42}"})
	if err != nil || output.ResultJSON != "{\"value\": 42}" {
		t.Fatalf("run = %#v, %v", output, err)
	}
}

func TestRunnerPreservesSandboxErrorMessage(t *testing.T) {
	runner, err := NewRunner(context.Background(), RunnerConfig{
		Workers:                        1,
		QueueSize:                      1,
		MaxSuccessfulRunsBeforeRecycle: 1,
	})
	if err != nil {
		t.Fatal(err)
	}
	defer runner.CloseContext(context.Background())

	_, err = runner.Run(context.Background(), RunInput{
		Script: "import socket\nsocket.create_connection(('example.com', 443))\noutput = {'reachable': True}",
	})
	if err == nil {
		t.Fatal("sandboxed socket import unexpectedly succeeded")
	}

	message := PublicMessage(err)
	if message == "python execution failed" || !strings.Contains(strings.ToLower(message), "socket") {
		t.Fatalf("sandbox error message = %q", message)
	}
}
