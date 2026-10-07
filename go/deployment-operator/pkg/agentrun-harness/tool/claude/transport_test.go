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

	acpsdk "github.com/coder/acp-go-sdk"

	console "github.com/pluralsh/console/go/client"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/usage"
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

func TestTransportTurnUsesRepositoryRootForACPAndProcess(t *testing.T) {
	binDir := t.TempDir()
	rootsPath := filepath.Join(t.TempDir(), "roots")
	writeClaudeACPHelperBinary(t, binDir)
	t.Setenv("PATH", binDir+string(os.PathListSeparator)+os.Getenv("PATH"))
	t.Setenv("CLAUDE_ACP_HELPER", "1")
	t.Setenv("CLAUDE_ACP_HELPER_BINARY", os.Args[0])
	t.Setenv("CLAUDE_ACP_ROOTS_FILE", rootsPath)

	config := toolv1.Config{
		WorkDir:       t.TempDir(),
		RepositoryDir: t.TempDir(),
		Run:           claudeTestRun(console.AgentRunModeAnalyze, "", false),
	}
	transport, err := NewTransport(NewAgent(config))
	if err != nil {
		t.Fatal(err)
	}
	result, err := transport.Turn(context.Background(), toolv1.TurnRequest{
		Prompt:   "inspect repository",
		Settings: toolv1.Settings{Mode: console.AgentRunModeAnalyze},
	}, &claudeTransportTestSink{})
	if err != nil {
		t.Fatalf("Turn() error = %v", err)
	}
	if result.SessionID != "claude-test-session" {
		t.Fatalf("session ID = %q", result.SessionID)
	}

	content, err := os.ReadFile(rootsPath)
	if err != nil {
		t.Fatal(err)
	}
	roots := testEnvValues(strings.Split(string(content), "\n"))
	for _, key := range []string{"cwd", "pwd"} {
		if roots[key] != transport.repositoryDir {
			t.Fatalf("%s = %q, want repository directory %q", key, roots[key], transport.repositoryDir)
		}
	}
	if transport.repositoryDir == config.WorkDir {
		t.Fatalf("repository directory unexpectedly uses work directory %q", config.WorkDir)
	}
}

func TestTransportProjectsClaudeACP(t *testing.T) {
	config := toolv1.Config{WorkDir: t.TempDir(), RepositoryDir: t.TempDir(), Run: claudeTestRun(console.AgentRunModeAnalyze, "", true)}
	transport, err := NewTransport(NewAgent(config))
	if err != nil {
		t.Fatal(err)
	}
	if capabilities := transport.Capabilities(); transport.Kind() != toolv1.TransportKindACP ||
		!capabilities.SessionResume || capabilities.FileSystemWrite {
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

func writeClaudeACPHelperBinary(t *testing.T, binDir string) {
	t.Helper()
	path := filepath.Join(binDir, claudeACPBinary)
	script := "#!/bin/sh\nexec \"$CLAUDE_ACP_HELPER_BINARY\" -test.run=TestClaudeACPHelperProcess --\n"
	if err := os.WriteFile(path, []byte(script), 0755); err != nil {
		t.Fatal(err)
	}
}

func TestClaudeACPHelperProcess(t *testing.T) {
	if os.Getenv("CLAUDE_ACP_HELPER") != "1" {
		return
	}

	agent := &claudeACPTestAgent{}
	connection := acpsdk.NewAgentSideConnection(agent, os.Stdout, os.Stdin)
	<-connection.Done()
}

type claudeACPTestAgent struct{}

var _ acpsdk.Agent = (*claudeACPTestAgent)(nil)

func (*claudeACPTestAgent) Authenticate(context.Context, acpsdk.AuthenticateRequest) (acpsdk.AuthenticateResponse, error) {
	return acpsdk.AuthenticateResponse{}, nil
}

func (*claudeACPTestAgent) Initialize(context.Context, acpsdk.InitializeRequest) (acpsdk.InitializeResponse, error) {
	return acpsdk.InitializeResponse{ProtocolVersion: acpsdk.ProtocolVersionNumber}, nil
}

func (*claudeACPTestAgent) Logout(context.Context, acpsdk.LogoutRequest) (acpsdk.LogoutResponse, error) {
	return acpsdk.LogoutResponse{}, nil
}

func (*claudeACPTestAgent) Cancel(context.Context, acpsdk.CancelNotification) error {
	return nil
}

func (*claudeACPTestAgent) CloseSession(context.Context, acpsdk.CloseSessionRequest) (acpsdk.CloseSessionResponse, error) {
	return acpsdk.CloseSessionResponse{}, nil
}

func (*claudeACPTestAgent) ListSessions(context.Context, acpsdk.ListSessionsRequest) (acpsdk.ListSessionsResponse, error) {
	return acpsdk.ListSessionsResponse{}, nil
}

func (*claudeACPTestAgent) NewSession(_ context.Context, params acpsdk.NewSessionRequest) (acpsdk.NewSessionResponse, error) {
	workingDirectory, err := os.Getwd()
	if err != nil {
		return acpsdk.NewSessionResponse{}, err
	}
	content := []byte("cwd=" + params.Cwd + "\npwd=" + workingDirectory + "\n")
	if err := os.WriteFile(os.Getenv("CLAUDE_ACP_ROOTS_FILE"), content, 0644); err != nil {
		return acpsdk.NewSessionResponse{}, err
	}
	return acpsdk.NewSessionResponse{SessionId: "claude-test-session"}, nil
}

func (*claudeACPTestAgent) Prompt(context.Context, acpsdk.PromptRequest) (acpsdk.PromptResponse, error) {
	return acpsdk.PromptResponse{StopReason: acpsdk.StopReasonEndTurn}, nil
}

func (*claudeACPTestAgent) ResumeSession(context.Context, acpsdk.ResumeSessionRequest) (acpsdk.ResumeSessionResponse, error) {
	return acpsdk.ResumeSessionResponse{}, nil
}

func (*claudeACPTestAgent) SetSessionConfigOption(context.Context, acpsdk.SetSessionConfigOptionRequest) (acpsdk.SetSessionConfigOptionResponse, error) {
	return acpsdk.SetSessionConfigOptionResponse{}, nil
}

func (*claudeACPTestAgent) SetSessionMode(context.Context, acpsdk.SetSessionModeRequest) (acpsdk.SetSessionModeResponse, error) {
	return acpsdk.SetSessionModeResponse{}, nil
}

type claudeTransportTestSink struct{}

func (*claudeTransportTestSink) Session(string) {}

func (*claudeTransportTestSink) Message(*console.AgentMessageAttributes, string) {}

func (*claudeTransportTestSink) ToolCallOutput(string, string) {}

func (*claudeTransportTestSink) Usage(usage.Record) {}

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
