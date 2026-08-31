package python

import (
	"errors"
	"testing"
)

func TestResolveRunnerConfigDefaultsAndOverlays(t *testing.T) {
	previous := currentExecutable
	currentExecutable = func() (string, error) { return "/test/python", nil }
	t.Cleanup(func() { currentExecutable = previous })

	defaults, err := resolveRunnerConfig(RunnerConfig{})
	if err != nil {
		t.Fatal(err)
	}

	if defaults.Workers != 4 || defaults.QueueSize != 16 || defaults.MaxSuccessfulRunsBeforeRecycle != 10 {
		t.Fatalf("defaults = %#v", defaults)
	}
	if defaults.WorkerProcess.Executable != "/test/python" {
		t.Fatalf("executable = %q", defaults.WorkerProcess.Executable)
	}
	if got := defaults.WorkerProcess.Arguments; len(got) != 1 || got[0] != "python-worker" {
		t.Fatalf("arguments = %#v", got)
	}
	if got := defaults.WorkerProcess.Environment; len(got) != 1 || got[0] != "TMPDIR=/tmp" {
		t.Fatalf("worker defaults = %#v", defaults.WorkerProcess)
	}

	arguments := []string{"child", "worker"}
	environment := []string{"TMPDIR=/sandbox"}
	resolved, err := resolveRunnerConfig(RunnerConfig{
		Workers:                        2,
		QueueSize:                      3,
		MaxSuccessfulRunsBeforeRecycle: 4,
		WorkerProcess: WorkerProcessConfig{
			Executable:  "/custom/python",
			Arguments:   arguments,
			Environment: environment,
		},
	})
	if err != nil {
		t.Fatal(err)
	}

	arguments[0] = "changed"
	environment[0] = "changed=value"
	if resolved.Workers != 2 || resolved.QueueSize != 3 || resolved.MaxSuccessfulRunsBeforeRecycle != 4 {
		t.Fatalf("numeric overlay = %#v", resolved)
	}
	if resolved.WorkerProcess.Executable != "/custom/python" {
		t.Fatalf("executable overlay = %q", resolved.WorkerProcess.Executable)
	}
	if resolved.WorkerProcess.Arguments[0] != "child" ||
		resolved.WorkerProcess.Environment[0] != "TMPDIR=/sandbox" {
		t.Fatalf("overlay = %#v", resolved)
	}

	empty, err := resolveRunnerConfig(RunnerConfig{WorkerProcess: WorkerProcessConfig{Arguments: []string{}, Environment: []string{}}})
	if err != nil || empty.WorkerProcess.Arguments == nil || empty.WorkerProcess.Environment == nil {
		t.Fatalf("explicit empty slices = %#v, %v", empty.WorkerProcess, err)
	}

	if len(empty.WorkerProcess.Arguments) != 0 || len(empty.WorkerProcess.Environment) != 0 {
		t.Fatalf("explicit empty slices = %#v, %v", empty.WorkerProcess, err)
	}
}

func TestNewRunnerRejectsInvalidValues(t *testing.T) {
	previous := currentExecutable
	currentExecutable = func() (string, error) { return "/test/python", nil }
	t.Cleanup(func() { currentExecutable = previous })
	for _, config := range []RunnerConfig{
		{Workers: -1},
		{QueueSize: -1},
		{MaxSuccessfulRunsBeforeRecycle: -1},
		{WorkerProcess: WorkerProcessConfig{Executable: "   "}},
		{WorkerProcess: WorkerProcessConfig{Environment: []string{"missing-equals"}}},
	} {
		if _, err := NewRunner(t.Context(), config); CodeOf(err) != InvalidArgument {
			t.Fatalf("config %#v: %v", config, err)
		}
	}

	currentExecutable = func() (string, error) { return "", errors.New("missing executable") }
	if _, err := resolveRunnerConfig(RunnerConfig{}); CodeOf(err) != Unavailable {
		t.Fatalf("executable error = %v", err)
	}

	custom, err := resolveRunnerConfig(RunnerConfig{WorkerProcess: WorkerProcessConfig{Executable: "/custom/python"}})
	if err != nil || custom.WorkerProcess.Executable != "/custom/python" {
		t.Fatalf("custom executable with unavailable default = %#v, %v", custom.WorkerProcess, err)
	}
}
