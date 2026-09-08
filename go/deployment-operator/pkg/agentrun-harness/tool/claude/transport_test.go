package claude

import (
	"context"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"

	console "github.com/pluralsh/console/go/client"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
	stackv1 "github.com/pluralsh/console/go/deployment-operator/pkg/harness/stackrun/v1"
)

func TestTransportLaunchUsesACPAdapterAndClaudeEnvironment(t *testing.T) {
	binDir, envPath := t.TempDir(), filepath.Join(t.TempDir(), "env")
	writeClaudeACPBinary(t, binDir)
	t.Setenv("PATH", binDir+string(os.PathListSeparator)+os.Getenv("PATH"))
	t.Setenv("CLAUDE_ENV_FILE", envPath)
	endpoint := "https://api.example"
	run := claudeTestRun(console.AgentRunModeWrite, "claude-opus", false)
	run.Runtime.Config.Claude.Endpoint = &endpoint
	config := toolv1.Config{WorkDir: t.TempDir(), RepositoryDir: t.TempDir(), Run: run}
	transport, err := NewTransport(NewAgent(config))
	if err != nil {
		t.Fatal(err)
	}
	var preStarts atomic.Int32
	process, err := transport.launch([]exec.Option{exec.WithHook(stackv1.LifecyclePreStart, func() error { preStarts.Add(1); return nil })})
	if err != nil {
		t.Fatal(err)
	}
	go io.Copy(io.Discard, process.Stdout)
	go io.Copy(io.Discard, process.Stderr)
	if err := process.Wait(); err != nil {
		t.Fatal(err)
	}
	if preStarts.Load() != 1 {
		t.Fatalf("pre starts = %d", preStarts.Load())
	}
	content, err := os.ReadFile(envPath)
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{claudeConfigEnv + "=" + filepath.Join(config.WorkDir, claudeConfigDir), claudeExecutableEnv + "=" + nativeClaudeBinary, claudeSandboxEnv + "=1", anthropicAPIKeyEnv + "=api-key", anthropicBaseURLEnv + "=" + endpoint} {
		if !strings.Contains(string(content), want) {
			t.Fatalf("environment missing %q: %s", want, content)
		}
	}
}

func TestTransportProjectsClaudeACP(t *testing.T) {
	config := toolv1.Config{WorkDir: t.TempDir(), RepositoryDir: t.TempDir(), Run: claudeTestRun(console.AgentRunModeAnalyze, "", true)}
	transport, err := NewTransport(NewAgent(config))
	if err != nil {
		t.Fatal(err)
	}
	if transport.Kind() != toolv1.TransportKindACP || !transport.Capabilities().SessionResume {
		t.Fatal("transport does not advertise ACP session resume")
	}
	settings, err := transport.agent.ResolveSettings(config.Run)
	if err != nil {
		t.Fatal(err)
	}
	if settings.Model.Name != "claude-sonnet-4-6" {
		t.Fatalf("model = %q", settings.Model.Name)
	}
	mode, err := transport.agent.modeID(settings.Mode)
	if err != nil || mode != defaultModeID {
		t.Fatalf("mode = %q, %v", mode, err)
	}
	mode, err = transport.agent.modeID(console.AgentRunModeWrite)
	if err != nil || mode != bypassModeID {
		t.Fatalf("write mode = %q, %v", mode, err)
	}
}

func TestACPEnvironmentUsesProxyCredential(t *testing.T) {
	config := toolv1.Config{WorkDir: t.TempDir(), RepositoryDir: t.TempDir(), Run: claudeTestRun(console.AgentRunModeWrite, "claude-sonnet", true)}
	agent := NewAgent(config)
	agent.consoleURL, agent.consoleToken = "https://console.example", "console-token"
	values := testEnvValues(agent.env(config))
	if values[anthropicAuthEnv] != "console-token" || values[anthropicBaseURLEnv] != "https://console.example/ext/ai/anthropic" {
		t.Fatalf("proxy environment = %#v", values)
	}
	if _, exists := values[anthropicAPIKeyEnv]; exists {
		t.Fatalf("proxy environment exposed direct API key: %#v", values)
	}
}

func TestTransportTurnRejectsCancelledAndUnsupportedMode(t *testing.T) {
	transport, err := NewTransport(NewAgent(toolv1.Config{WorkDir: t.TempDir(), RepositoryDir: t.TempDir(), Run: claudeTestRun(console.AgentRunModeWrite, "", false)}))
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := transport.Turn(ctx, toolv1.TurnRequest{}, nil); !errors.Is(err, context.Canceled) {
		t.Fatalf("Turn() error = %v", err)
	}
	if _, err := transport.Turn(nil, toolv1.TurnRequest{Settings: toolv1.Settings{Mode: console.AgentRunMode("unsupported")}}, nil); err == nil || !strings.Contains(err.Error(), "unsupported claude ACP mode") {
		t.Fatalf("Turn() error = %v", err)
	}
}

func writeClaudeACPBinary(t *testing.T, binDir string) {
	t.Helper()
	path := filepath.Join(binDir, claudeACPBinary)
	script := "#!/bin/sh\nprintf 'CLAUDE_CONFIG_DIR=%s\\nCLAUDE_CODE_EXECUTABLE=%s\\nIS_SANDBOX=%s\\nANTHROPIC_API_KEY=%s\\nANTHROPIC_AUTH_TOKEN=%s\\nANTHROPIC_BASE_URL=%s\\n' \"$CLAUDE_CONFIG_DIR\" \"$CLAUDE_CODE_EXECUTABLE\" \"$IS_SANDBOX\" \"$ANTHROPIC_API_KEY\" \"$ANTHROPIC_AUTH_TOKEN\" \"$ANTHROPIC_BASE_URL\" > \"$CLAUDE_ENV_FILE\"\n"
	if err := os.WriteFile(path, []byte(script), 0755); err != nil {
		t.Fatal(err)
	}
}

func testEnvValues(env []string) map[string]string {
	values := make(map[string]string, len(env))
	for _, item := range env {
		key, value, ok := strings.Cut(item, "=")
		if ok {
			values[key] = value
		}
	}
	return values
}
