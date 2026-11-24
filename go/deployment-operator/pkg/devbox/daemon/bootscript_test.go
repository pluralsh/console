package daemon

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

func waitFor(t *testing.T, what string, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(10 * time.Second)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatalf("timed out waiting for %s", what)
}

// The boot script runs when the daemon of an existing instance starts (a cold boot), and never on the start
// that creates the instance.
func TestBootScriptRunsOnColdBootOfAnExistingInstance(t *testing.T) {
	cfg := testConfig(t, t.TempDir())
	script := filepath.Join(cfg.Home, ".config", "devbox", "boot.sh")
	marker := filepath.Join(cfg.Home, "booted")
	if err := os.MkdirAll(filepath.Dir(script), 0o755); err != nil {
		t.Fatal(err)
	}
	// Not executable on purpose: it is run with sh.
	if err := os.WriteFile(script, []byte("echo \"home=$HOME pwd=$(pwd)\" >> \"$HOME/booted\"\necho reinstalled\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	r := start(t, cfg)
	if _, err := r.client.Initialize(ctxT(t), &devboxv1.InitializeRequest{InstanceId: "inst-1"}); err != nil {
		t.Fatal(err)
	}
	time.Sleep(200 * time.Millisecond)
	if _, err := os.Stat(marker); err == nil {
		t.Fatal("the boot script ran on the instance's first start")
	}
	var state instanceFile
	data, err := os.ReadFile(filepath.Join(cfg.StateDir, "instance.json"))
	if err != nil || json.Unmarshal(data, &state) != nil || state.Schema != instanceSchema {
		t.Fatalf("instance.json = %s (%v), want schema %d", data, err, instanceSchema)
	}
	r.stop()

	r2 := start(t, cfg)
	defer r2.stop()
	waitFor(t, "the boot script", func() bool { _, err := os.Stat(marker); return err == nil })
	got, _ := os.ReadFile(marker)
	if want := "home=" + cfg.Home + " pwd="; !strings.HasPrefix(string(got), want) || strings.Count(string(got), "\n") != 1 {
		t.Fatalf("boot script ran with %q, want one run starting with %q", got, want)
	}
	waitFor(t, "the boot log", func() bool {
		log, _ := os.ReadFile(filepath.Join(cfg.StateDir, bootScriptLog))
		return strings.Contains(string(log), "reinstalled")
	})
}

// A failing or hanging boot script is reported, and the instance starts regardless.
func TestBootScriptFailureDoesNotBlockTheDaemon(t *testing.T) {
	for name, tc := range map[string]struct {
		script  string
		timeout time.Duration
		want    string
	}{
		"exit code": {script: "echo broken >&2\nexit 3\n", want: "exit status 3"},
		"timeout":   {script: "sleep 30\n", timeout: 200 * time.Millisecond, want: "timed out after 200ms"},
	} {
		t.Run(name, func(t *testing.T) {
			cfg := testConfig(t, t.TempDir())
			cfg.BootScriptTimeout = tc.timeout
			r := start(t, cfg)
			if _, err := r.client.Initialize(ctxT(t), &devboxv1.InitializeRequest{InstanceId: "inst-1"}); err != nil {
				t.Fatal(err)
			}
			r.stop()

			script := filepath.Join(cfg.Home, ".config", "devbox", "boot.sh")
			if err := os.MkdirAll(filepath.Dir(script), 0o755); err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(script, []byte(tc.script), 0o755); err != nil {
				t.Fatal(err)
			}
			r2 := start(t, cfg)
			defer r2.stop()
			if _, err := r2.client.Health(ctxT(t), &devboxv1.HealthRequest{}); err != nil {
				t.Fatalf("the daemon doesn't serve while the boot script runs: %v", err)
			}
			waitFor(t, "the failure condition", func() bool {
				for _, c := range conditionsOf(t, r2) {
					if c.GetType() == bootScriptCondition && c.GetActive() && strings.Contains(c.GetMessage(), tc.want) {
						return true
					}
				}
				return false
			})
		})
	}
}

// A state file from a daemon that didn't write a schema version, or from a newer one with fields this one
// doesn't know, still restores the instance.
func TestInstanceStateFromOtherDaemonVersions(t *testing.T) {
	for name, state := range map[string]string{
		"no schema":    `{"request":"eyJpbnN0YW5jZUlkIjoiaW5zdC0xIn0=","firstThreadDone":true}`,
		"newer schema": `{"schema":99,"request":"eyJpbnN0YW5jZUlkIjoiaW5zdC0xIiwiZnV0dXJlRmllbGQiOiJ4In0=","firstThreadDone":true,"later":1}`,
	} {
		t.Run(name, func(t *testing.T) {
			cfg := testConfig(t, t.TempDir())
			if err := os.MkdirAll(cfg.StateDir, 0o700); err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(filepath.Join(cfg.StateDir, "instance.json"), []byte(state), 0o600); err != nil {
				t.Fatal(err)
			}
			d, err := New(cfg)
			if err != nil {
				t.Fatal(err)
			}
			if got := d.instanceID(); got != "inst-1" {
				t.Fatalf("instance id = %q, want inst-1", got)
			}
		})
	}
}

// conditionsOf returns the conditions in the daemon's event log.
func conditionsOf(t *testing.T, r *running) []*devboxv1.DaemonCondition {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()
	var out []*devboxv1.DaemonCondition
	_ = r.d.events.Subscribe(ctx, 0, func(ev *devboxv1.DaemonEvent) error {
		if c := ev.GetCondition(); c != nil {
			out = append(out, c)
		}
		return nil
	})
	return out
}
