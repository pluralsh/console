package python

import (
	"bytes"
	"context"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
	"testing"
	"time"
)

func TestMain(m *testing.M) {
	if len(os.Args) == 2 && os.Args[1] == "python-worker" {
		if err := RunWorker(os.Stdin, os.Stdout); err != nil {
			os.Exit(1)
		}
		os.Exit(0)
	}
	if len(os.Args) == 2 && os.Args[1] == "fake-python-worker" {
		if err := runFakeWorker(os.Stdin, os.Stdout); err != nil {
			os.Exit(1)
		}
		os.Exit(0)
	}
	os.Exit(m.Run())
}

func TestValidateRunInput(t *testing.T) {
	for _, raw := range []string{"[]", "1", "{"} {
		if _, err := validateRunInput(raw); ErrorCode(err) != InvalidArgument {
			t.Fatalf("validateRunInput(%q) = %v", raw, err)
		}
	}
	if got, err := validateRunInput(""); err != nil || got != "{}" {
		t.Fatalf("validateRunInput(empty) = %q, %v", got, err)
	}
}

func TestPoolDefaults(t *testing.T) {
	if defaultWorkers != 4 {
		t.Fatalf("defaultWorkers = %d, want 4", defaultWorkers)
	}
	if maxCheckouts != 10 {
		t.Fatalf("maxCheckouts = %d, want 10", maxCheckouts)
	}
}

func TestDefaultQueueSize(t *testing.T) {
	runner, err := newFakeRunner(t, Config{Workers: 1, MaxSuccessfulRuns: 1})
	if err != nil {
		t.Fatalf("New() error: %v", err)
	}
	defer runner.Close()
	if got := cap(runner.jobs); got != 16 {
		t.Fatalf("queue capacity = %d, want 16", got)
	}
}

func TestWorkerReusesTenSuccessfulRunsWithoutHealthChecks(t *testing.T) {
	runner, err := newFakeRunner(t, Config{Workers: 1})
	if err != nil {
		t.Fatalf("New() error: %v", err)
	}
	defer runner.Close()

	var firstPID string
	for run := 0; run < maxCheckouts; run++ {
		output, err := runner.Run(context.Background(), RunInput{Script: "success"})
		if err != nil {
			t.Fatalf("run %d error: %v", run+1, err)
		}
		if run == 0 {
			firstPID = output.ResultJSON
		} else if output.ResultJSON != firstPID {
			t.Fatalf("run %d used %s, want original worker %s", run+1, output.ResultJSON, firstPID)
		}
	}

	output, err := runAfterReplacement(t, runner, RunInput{Script: "success"})
	if err != nil {
		t.Fatalf("replacement run error: %v", err)
	}
	if output.ResultJSON == firstPID {
		t.Fatalf("worker was not recycled after %d successful runs", maxCheckouts)
	}
}

func TestWorkerResponseErrorTriggersReplacement(t *testing.T) {
	runner, err := newFakeRunner(t, Config{Workers: 1})
	if err != nil {
		t.Fatalf("New() error: %v", err)
	}
	defer runner.Close()

	first, err := runner.Run(context.Background(), RunInput{Script: "success"})
	if err != nil {
		t.Fatalf("initial run error: %v", err)
	}
	if _, err := runner.Run(context.Background(), RunInput{Script: "resource-error"}); ErrorCode(err) != ResourceExhausted {
		t.Fatalf("resource response error = %v", err)
	}
	second, err := runAfterReplacement(t, runner, RunInput{Script: "success"})
	if err != nil {
		t.Fatalf("replacement run error: %v", err)
	}
	if second.ResultJSON == first.ResultJSON {
		t.Fatal("worker was reused after a resource-exhausted response")
	}
}

func TestProtocolRejectsUnknownAndTrailingValues(t *testing.T) {
	for _, body := range []string{
		`{"version":1,"type":"health","id":"1","extra":true}`,
		`{"version":1,"type":"health","id":"1"} {}`,
	} {
		var framed bytes.Buffer
		if err := writeRawFrame(&framed, []byte(body)); err != nil {
			t.Fatal(err)
		}
		var request protocolRequest
		if err := readFrame(&framed, &request); err == nil {
			t.Fatalf("readFrame(%s) accepted invalid payload", body)
		}
	}
}

func TestRunWorkerHealth(t *testing.T) {
	configureWorkerEnvironment(t)
	var input, output bytes.Buffer
	if err := writeFrame(&input, protocolRequest{Version: protocolVersion, Type: requestHealth, ID: "1"}); err != nil {
		t.Fatal(err)
	}
	if err := RunWorker(&input, &output); err != nil {
		t.Fatalf("RunWorker() error: %v", err)
	}
	var response protocolResponse
	if err := readFrame(&output, &response); err != nil {
		t.Fatal(err)
	}
	if response.Code != "" || response.ID != "1" {
		t.Fatalf("health response = %#v", response)
	}
}

func TestRunWorkerUsesFreshStateAndSeparatesStdout(t *testing.T) {
	configureWorkerEnvironment(t)
	var input, output bytes.Buffer
	requests := []protocolRequest{
		{Version: protocolVersion, Type: requestRun, ID: "first", Script: "secret = 42\noutput = {'sum': input['value'] + 1}\nprint('ok')", InputJSON: `{"value": 1}`},
		{Version: protocolVersion, Type: requestRun, ID: "second", Script: "output = {'secret': secret}", InputJSON: `{}`},
	}
	for _, request := range requests {
		if err := writeFrame(&input, request); err != nil {
			t.Fatal(err)
		}
	}
	if err := RunWorker(&input, &output); err != nil {
		t.Fatalf("RunWorker() error: %v", err)
	}

	var first protocolResponse
	if err := readFrame(&output, &first); err != nil {
		t.Fatal(err)
	}
	if first.Code != "" || first.ResultJSON != `{"sum": 2}` || first.Stdout != "ok\n" {
		t.Fatalf("first response = %#v", first)
	}
	var second protocolResponse
	if err := readFrame(&output, &second); err != nil {
		t.Fatal(err)
	}
	if second.Code != FailedPrecondition || second.ResultJSON != "" || second.Stdout != "" {
		t.Fatalf("second response = %#v", second)
	}
}

func TestRunRejectsBoundsBeforeAdmission(t *testing.T) {
	runner := &Runner{jobs: make(chan *job), healthy: 1}
	_, err := runner.Run(context.Background(), RunInput{Script: strings.Repeat("x", MaxSourceBytes+1)})
	if ErrorCode(err) != InvalidArgument {
		t.Fatalf("source error = %v", err)
	}
	_, err = runner.Run(context.Background(), RunInput{Script: "pass", InputJSON: strings.Repeat("x", MaxInputBytes+1)})
	if ErrorCode(err) != InvalidArgument {
		t.Fatalf("input error = %v", err)
	}
}

func TestRunnerSelfSpawnsAndQueuesUntilCapacityReturns(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	runner, err := New(ctx, WithConfig(Config{Workers: 1, QueueSize: 1, MaxSuccessfulRuns: 100}))
	if err != nil {
		t.Fatalf("New() error: %v", err)
	}
	defer runner.Close()

	firstCtx, cancelFirst := context.WithCancel(ctx)
	first := make(chan error, 1)
	go func() {
		_, err := runner.Run(firstCtx, RunInput{Script: "while True:\n    pass"})
		first <- err
	}()
	time.Sleep(50 * time.Millisecond)

	second := make(chan runResult, 1)
	go func() {
		output, err := runner.Run(ctx, RunInput{Script: "output = {'value': 42}"})
		second <- runResult{output: output, err: err}
	}()
	deadline := time.Now().Add(time.Second)
	for len(runner.jobs) != 1 && time.Now().Before(deadline) {
		time.Sleep(time.Millisecond)
	}
	if len(runner.jobs) != 1 {
		t.Fatal("second request did not enter the queue")
	}
	if _, err := runner.Run(ctx, RunInput{Script: "output = {}"}); ErrorCode(err) != ResourceExhausted {
		t.Fatalf("full queue error = %v", err)
	}

	cancelFirst()
	if err := <-first; ErrorCode(err) != Canceled {
		t.Fatalf("canceled run error = %v", err)
	}
	result := <-second
	if result.err != nil || result.output == nil || result.output.ResultJSON != `{"value": 42}` {
		t.Fatalf("queued run = %#v, %v", result.output, result.err)
	}
}

func writeRawFrame(out *bytes.Buffer, body []byte) error {
	frame := make([]byte, 4)
	binary.BigEndian.PutUint32(frame, uint32(len(body)))
	_, err := out.Write(append(frame, body...))
	return err
}

func configureWorkerEnvironment(t *testing.T) {
	t.Helper()
	t.Setenv("HOME", "")
	t.Setenv("XDG_CACHE_HOME", "")
	t.Setenv("TMPDIR", "/tmp")
}

func newFakeRunner(t *testing.T, config Config) (*Runner, error) {
	t.Helper()
	config.Executable = os.Args[0]
	config.Arguments = []string{"fake-python-worker"}
	return New(context.Background(), WithConfig(config))
}

func runAfterReplacement(t *testing.T, runner *Runner, input RunInput) (*RunOutput, error) {
	t.Helper()
	deadline := time.Now().Add(time.Second)
	for {
		output, err := runner.Run(context.Background(), input)
		if ErrorCode(err) != Unavailable || time.Now().After(deadline) {
			return output, err
		}
		time.Sleep(time.Millisecond)
	}
}

func runFakeWorker(in *os.File, out *os.File) error {
	ran := false
	for {
		var request protocolRequest
		if err := readFrame(in, &request); err != nil {
			if errors.Is(err, io.EOF) {
				return nil
			}
			return err
		}
		response := protocolResponse{Version: protocolVersion, Type: request.Type, ID: request.ID}
		switch request.Type {
		case requestHealth:
			if ran {
				response.Code = Internal
				response.Message = "unexpected health request"
			}
		case requestRun:
			ran = true
			if request.Script == "resource-error" {
				response.Code = ResourceExhausted
				response.Message = "python resource limit exceeded"
			} else {
				response.ResultJSON = fmt.Sprintf(`{"pid":%d}`, os.Getpid())
			}
		default:
			return fmt.Errorf("unexpected request type %q", request.Type)
		}
		if err := writeFrame(out, response); err != nil {
			return err
		}
	}
}
