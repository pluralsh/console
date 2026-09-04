package codex

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

func TestTransportLaunchPreservesHooksAndACPEnvironment(t *testing.T) {
	binDir := t.TempDir()
	envPath := filepath.Join(t.TempDir(), "env")
	writeCodexACPBinary(t, binDir)
	t.Setenv(pathEnv, binDir+string(os.PathListSeparator)+os.Getenv(pathEnv))
	t.Setenv("CODEX_ENV_FILE", envPath)
	endpoint := "https://api.example/v1"
	run := codexTestRun(console.AgentRunModeWrite, "gpt-5.4", false)
	run.Runtime.Config.Codex.Endpoint = &endpoint
	config := toolv1.Config{WorkDir: t.TempDir(), RepositoryDir: t.TempDir(), Run: run}
	agent := NewAgent(config)
	settings, err := agent.ResolveSettings(run)
	if err != nil {
		t.Fatal(err)
	}
	transport, err := NewTransport(agent)
	if err != nil {
		t.Fatal(err)
	}
	model := agent.resolveModelForSettings(config, settings)
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
	}, model)
	if err != nil {
		t.Fatalf("launch() error = %v", err)
	}
	go io.Copy(io.Discard, process.Stdout)
	go io.Copy(io.Discard, process.Stderr)
	if err := process.Wait(); err != nil {
		t.Fatalf("process.Wait() error = %v", err)
	}
	if preStarts.Load() != 1 || postStarts.Load() != 1 {
		t.Fatalf("hooks = %d/%d, want 1/1", preStarts.Load(), postStarts.Load())
	}
	env, err := os.ReadFile(envPath)
	if err != nil {
		t.Fatal(err)
	}
	content := string(env)
	for _, want := range []string{
		consoleTokenEnv + "=",
		codexAPIKeyEnv + "=api-key",
		openAIAPIKeyEnv + "=api-key",
		defaultAuthRequestEnv + `={"methodId":"api-key"}`,
		noBrowserEnv + "=1",
		modelProviderEnv + "=custom",
		codexHomeEnv + "=" + filepath.Join(config.WorkDir, codexHomeDir),
		codexConfigEnv + `={"model":"gpt-5.4"}`,
	} {
		if !strings.Contains(content, want) {
			t.Fatalf("environment missing %q: %s", want, content)
		}
	}
}

func TestTransportProjectsCodexACP(t *testing.T) {
	config := toolv1.Config{WorkDir: t.TempDir(), RepositoryDir: t.TempDir(), Run: codexTestRun(console.AgentRunModeAnalyze, "gpt-5.4", true)}
	transport, err := NewTransport(NewAgent(config))
	if err != nil {
		t.Fatal(err)
	}
	if transport.Kind() != toolv1.TransportKindACP {
		t.Fatalf("transport kind = %q, want ACP", transport.Kind())
	}
	model, reasoning, modeID, err := transport.agent.resolveACPSettings(toolv1.Settings{Mode: console.AgentRunModeAnalyze, Model: toolv1.ModelSelection{Name: "openai/gpt-5.4"}})
	if err != nil {
		t.Fatal(err)
	}
	if model != "openai/gpt-5.4" || reasoning != defaultReasoning || modeID != acpModeID {
		t.Fatalf("ACP settings = %q, %q, %q", model, reasoning, modeID)
	}
}

func TestTransportTurnReturnsPreCancelledContextBeforeLaunch(t *testing.T) {
	config := toolv1.Config{WorkDir: t.TempDir(), RepositoryDir: t.TempDir(), Run: codexTestRun(console.AgentRunModeWrite, "gpt-5.4", false)}
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
	config := toolv1.Config{WorkDir: t.TempDir(), RepositoryDir: t.TempDir(), Run: codexTestRun(console.AgentRunModeWrite, "gpt-5.4", false)}
	transport, err := NewTransport(NewAgent(config))
	if err != nil {
		t.Fatal(err)
	}

	_, err = transport.Turn(nil, toolv1.TurnRequest{Settings: toolv1.Settings{Mode: console.AgentRunMode("unsupported")}}, nil)
	if err == nil || !strings.Contains(err.Error(), "unsupported codex ACP mode") {
		t.Fatalf("Turn() error = %v, want unsupported mode", err)
	}
}

func writeCodexACPBinary(t *testing.T, binDir string) {
	t.Helper()
	path := filepath.Join(binDir, codexACPBinary)
	script := "#!/bin/sh\n" +
		"printf 'PLRL_CONSOLE_TOKEN=%s\\nCODEX_HOME=%s\\nCODEX_API_KEY=%s\\nOPENAI_API_KEY=%s\\nDEFAULT_AUTH_REQUEST=%s\\nNO_BROWSER=%s\\nMODEL_PROVIDER=%s\\nCODEX_CONFIG=%s\\n' \"$PLRL_CONSOLE_TOKEN\" \"$CODEX_HOME\" \"$CODEX_API_KEY\" \"$OPENAI_API_KEY\" \"$DEFAULT_AUTH_REQUEST\" \"$NO_BROWSER\" \"$MODEL_PROVIDER\" \"$CODEX_CONFIG\" > \"$CODEX_ENV_FILE\"\n"
	if err := os.WriteFile(path, []byte(script), 0755); err != nil {
		t.Fatal(err)
	}
}
