package opencode

import (
	"context"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
	stackv1 "github.com/pluralsh/console/go/deployment-operator/pkg/harness/stackrun/v1"
)

func TestTransportLaunchPreservesLifecycleHooks(t *testing.T) {
	binDir := t.TempDir()
	opencodePath := filepath.Join(binDir, "opencode")
	if err := os.WriteFile(opencodePath, []byte("#!/bin/sh\nexit 0\n"), 0755); err != nil {
		t.Fatalf("write fake opencode: %v", err)
	}
	t.Setenv("PATH", binDir+string(os.PathListSeparator)+os.Getenv("PATH"))

	config := toolv1.Config{
		WorkDir:       t.TempDir(),
		RepositoryDir: t.TempDir(),
		Run: &agentrunv1.AgentRun{Runtime: &agentrunv1.AgentRuntime{
			Config: &agentrunv1.AgentRuntimeConfig{OpenCode: &agentrunv1.OpencodeConfig{Timeout: time.Minute}},
		}},
	}
	transport, err := NewTransport(NewAgent(config))
	if err != nil {
		t.Fatalf("NewTransport() error = %v", err)
	}

	var preStarts, postStarts atomic.Int32
	process, err := transport.launch([]exec.Option{
		exec.WithHook(stackv1.LifecyclePreStart, func() error {
			preStarts.Add(1)
			return nil
		}),
		exec.WithHook(stackv1.LifecyclePostStart, func() error {
			postStarts.Add(1)
			return nil
		}),
	})
	if err != nil {
		t.Fatalf("launch() error = %v", err)
	}
	go io.Copy(io.Discard, process.Stdout)
	go io.Copy(io.Discard, process.Stderr)
	if err := process.Wait(); err != nil {
		t.Fatalf("process.Wait() error = %v", err)
	}
	if got := preStarts.Load(); got != 1 {
		t.Fatalf("pre-start hooks = %d, want 1", got)
	}
	if got := postStarts.Load(); got != 1 {
		t.Fatalf("post-start hooks = %d, want 1", got)
	}
}

func TestTransportTurnReturnsPreCancelledContextBeforeLaunch(t *testing.T) {
	config := toolv1.Config{
		WorkDir:       t.TempDir(),
		RepositoryDir: t.TempDir(),
		Run:           &agentrunv1.AgentRun{Runtime: &agentrunv1.AgentRuntime{Config: &agentrunv1.AgentRuntimeConfig{OpenCode: &agentrunv1.OpencodeConfig{Timeout: time.Minute}}}},
	}
	transport, err := NewTransport(NewAgent(config))
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err = transport.Turn(ctx, toolv1.TurnRequest{}, nil)
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("Turn() error = %v, want context canceled", err)
	}
}

func TestTransportTurnAcceptsNilContext(t *testing.T) {
	config := toolv1.Config{
		WorkDir:       t.TempDir(),
		RepositoryDir: t.TempDir(),
		Run:           &agentrunv1.AgentRun{Runtime: &agentrunv1.AgentRuntime{Config: &agentrunv1.AgentRuntimeConfig{OpenCode: &agentrunv1.OpencodeConfig{Timeout: time.Minute}}}},
	}
	transport, err := NewTransport(NewAgent(config))
	if err != nil {
		t.Fatal(err)
	}

	_, err = transport.Turn(nil, toolv1.TurnRequest{Settings: toolv1.Settings{Mode: console.AgentRunMode("unsupported")}}, nil)
	if err == nil || !strings.Contains(err.Error(), "unsupported opencode ACP mode") {
		t.Fatalf("Turn() error = %v, want unsupported mode", err)
	}
}
