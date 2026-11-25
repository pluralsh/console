package agents

import (
	"context"
	"io"
	"log/slog"
	"os/exec"
	"strings"
	"testing"
	"unicode/utf8"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/harness"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/proc"
)

// shLauncher starts every agent as a sh script.
type shLauncher struct{ script string }

func (l shLauncher) Spec(launch *devboxv1.AgentLaunch, _ *devboxv1.HarnessEndpoints, _ string) (*harness.Spec, error) {
	return &harness.Spec{Agent: launch.GetAgent(), Path: "/bin/sh", Args: []string{"-c", l.script}, Billing: launch.GetBilling()}, nil
}

// A harness that exits before answering initialize (here, as Node does on an older glibc) has its last stderr
// lines in the probe error, which is all the operator and the user get to see.
func TestProbeReportsWhyAHarnessExited(t *testing.T) {
	if _, err := exec.LookPath("/bin/sh"); err != nil {
		t.Skip("no /bin/sh")
	}
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	sup := proc.NewSupervisor(log)
	defer sup.StopAll(context.Background(), 0)
	script := `echo "node: /lib64/libc.so.6: version GLIBC_2.28 not found (required by node)" >&2; exit 1`
	got := Probe(context.Background(), ProbeOptions{Launcher: shLauncher{script: script}, Supervisor: sup, Log: log,
		ScratchDir: t.TempDir()}, []*devboxv1.AgentProbeSpec{{Type: devboxv1.AgentType_AGENT_TYPE_CLAUDE, IsDefault: true}})
	if len(got) != 1 {
		t.Fatalf("got %d entries", len(got))
	}
	if got[0].GetProbeStatus() != devboxv1.ProbeStatus_PROBE_STATUS_FAILED {
		t.Fatalf("status = %s", got[0].GetProbeStatus())
	}
	if err := got[0].GetProbeError(); !strings.Contains(err, "GLIBC_2.28 not found") {
		t.Errorf("probe error %q doesn't say why the harness exited", err)
	}
}

// Only the loader's lines reach an error message, as valid UTF-8 cut on a character boundary, including a last
// line without a newline: anything else on stderr can quote the user's config.
func TestStderrTailKeepsLoaderErrors(t *testing.T) {
	w := &logWriter{log: slog.New(slog.NewTextHandler(io.Discard, nil))}
	long := "node: /lib64/libc.so.6: version `GLIBC_2.28' not found (required by node) " + strings.Repeat("x", 225) + "✖✖✖" // byte 300 is inside the first ✖
	_, _ = w.Write([]byte("config.toml line 3: Authorization = \"Bearer secret\"\n" + long + "\n\x1b[31mGLIBCXX_3.4.26\xff missing"))
	tail := w.Tail()
	if strings.Contains(tail, "secret") {
		t.Errorf("tail %q keeps a line that isn't the loader's", tail)
	}
	if !utf8.ValidString(tail) {
		t.Errorf("tail %q is not valid UTF-8", tail)
	}
	parts := strings.Split(tail, "; ")
	if len(parts) != 2 || !strings.HasSuffix(parts[0], "...") || len(parts[0]) > stderrTailLen+3 {
		t.Fatalf("tail %q, want the cut loader line and the unterminated one", tail)
	}
	if strings.ContainsRune(parts[1], 0x1b) || !strings.Contains(parts[1], "GLIBCXX_3.4.26") {
		t.Errorf("last line %q should keep the message without control characters", parts[1])
	}
}
