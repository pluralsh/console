package acp

import (
	"context"
	"io"
	"log/slog"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	acpsdk "github.com/coder/acp-go-sdk"
	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/usage"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
)

type scriptedState struct {
	mu sync.Mutex

	initializations []acpsdk.InitializeRequest
	newSessions     []acpsdk.NewSessionRequest
	resumedSessions []acpsdk.ResumeSessionRequest
	configOptions   []acpsdk.SessionConfigOption
	setConfig       []acpsdk.SetSessionConfigOptionRequest
	modes           *acpsdk.SessionModeState
	setModes        []acpsdk.SetSessionModeRequest
	prompts         []string
	stopReason      acpsdk.StopReason
}

type scriptedAgent struct {
	state *scriptedState
	conn  *acpsdk.AgentSideConnection
}

func (agent *scriptedAgent) Authenticate(context.Context, acpsdk.AuthenticateRequest) (acpsdk.AuthenticateResponse, error) {
	return acpsdk.AuthenticateResponse{}, nil
}

func (agent *scriptedAgent) Initialize(_ context.Context, request acpsdk.InitializeRequest) (acpsdk.InitializeResponse, error) {
	agent.state.mu.Lock()
	agent.state.initializations = append(agent.state.initializations, request)
	agent.state.mu.Unlock()
	return acpsdk.InitializeResponse{ProtocolVersion: acpsdk.ProtocolVersionNumber}, nil
}

func (agent *scriptedAgent) Logout(context.Context, acpsdk.LogoutRequest) (acpsdk.LogoutResponse, error) {
	return acpsdk.LogoutResponse{}, nil
}

func (agent *scriptedAgent) Cancel(context.Context, acpsdk.CancelNotification) error {
	return nil
}

func (agent *scriptedAgent) CloseSession(context.Context, acpsdk.CloseSessionRequest) (acpsdk.CloseSessionResponse, error) {
	return acpsdk.CloseSessionResponse{}, nil
}

func (agent *scriptedAgent) ListSessions(context.Context, acpsdk.ListSessionsRequest) (acpsdk.ListSessionsResponse, error) {
	return acpsdk.ListSessionsResponse{}, nil
}

func (agent *scriptedAgent) NewSession(_ context.Context, request acpsdk.NewSessionRequest) (acpsdk.NewSessionResponse, error) {
	agent.state.mu.Lock()
	agent.state.newSessions = append(agent.state.newSessions, request)
	agent.state.mu.Unlock()
	agent.state.mu.Lock()
	configOptions := agent.state.configOptions
	modes := agent.state.modes
	agent.state.mu.Unlock()
	return acpsdk.NewSessionResponse{SessionId: "session-1", ConfigOptions: configOptions, Modes: modes}, nil
}

func (agent *scriptedAgent) Prompt(ctx context.Context, request acpsdk.PromptRequest) (acpsdk.PromptResponse, error) {
	prompt := ""
	if len(request.Prompt) > 0 && request.Prompt[0].Text != nil {
		prompt = request.Prompt[0].Text.Text
	}
	agent.state.mu.Lock()
	agent.state.prompts = append(agent.state.prompts, prompt)
	stopReason := agent.state.stopReason
	agent.state.mu.Unlock()
	if err := agent.conn.SessionUpdate(ctx, acpsdk.SessionNotification{
		SessionId: request.SessionId,
		Update:    acpsdk.UpdateAgentMessageText("response: " + prompt),
	}); err != nil {
		return acpsdk.PromptResponse{}, err
	}
	if stopReason == "" {
		stopReason = acpsdk.StopReasonEndTurn
	}
	return acpsdk.PromptResponse{StopReason: stopReason}, nil
}

func (agent *scriptedAgent) ResumeSession(_ context.Context, request acpsdk.ResumeSessionRequest) (acpsdk.ResumeSessionResponse, error) {
	agent.state.mu.Lock()
	agent.state.resumedSessions = append(agent.state.resumedSessions, request)
	agent.state.mu.Unlock()
	agent.state.mu.Lock()
	configOptions := agent.state.configOptions
	modes := agent.state.modes
	agent.state.mu.Unlock()
	return acpsdk.ResumeSessionResponse{ConfigOptions: configOptions, Modes: modes}, nil
}

func (agent *scriptedAgent) SetSessionConfigOption(_ context.Context, request acpsdk.SetSessionConfigOptionRequest) (acpsdk.SetSessionConfigOptionResponse, error) {
	agent.state.mu.Lock()
	agent.state.setConfig = append(agent.state.setConfig, request)
	configOptions := agent.state.configOptions
	agent.state.mu.Unlock()
	return acpsdk.SetSessionConfigOptionResponse{ConfigOptions: configOptions}, nil
}

func (agent *scriptedAgent) SetSessionMode(_ context.Context, request acpsdk.SetSessionModeRequest) (acpsdk.SetSessionModeResponse, error) {
	agent.state.mu.Lock()
	agent.state.setModes = append(agent.state.setModes, request)
	agent.state.mu.Unlock()
	return acpsdk.SetSessionModeResponse{}, nil
}

func scriptedProcess(state *scriptedState) *exec.StdioProcess {
	clientToAgentReader, clientToAgentWriter := io.Pipe()
	agentToClientReader, agentToClientWriter := io.Pipe()
	agent := &scriptedAgent{state: state}
	agent.conn = acpsdk.NewAgentSideConnection(agent, agentToClientWriter, clientToAgentReader)
	agent.conn.SetLogger(slog.New(slog.NewTextHandler(io.Discard, nil)))

	var closeOnce sync.Once
	closePipes := func() {
		closeOnce.Do(func() {
			_ = clientToAgentWriter.Close()
			_ = clientToAgentReader.Close()
			_ = agentToClientWriter.Close()
			_ = agentToClientReader.Close()
		})
	}
	return exec.NewStdioProcess(clientToAgentWriter, agentToClientReader, io.NopCloser(strings.NewReader("")), exec.StdioProcessHooks{
		Wait: func() error {
			closePipes()
			return nil
		},
		Kill: func() error {
			closePipes()
			return nil
		},
		Stop: func() error {
			closePipes()
			return nil
		},
		Close: func() error {
			closePipes()
			return nil
		},
	})
}

func testTool(t *testing.T, state *scriptedState) *Tool {
	t.Helper()
	repositoryDir := t.TempDir()
	workDir := t.TempDir()
	run := &agentrunv1.AgentRun{Prompt: "initial"}
	tool := New(toolv1.Config{
		WorkDir:       workDir,
		RepositoryDir: repositoryDir,
		Run:           run,
		Usage:         usage.New(nil),
		ErrorChan:     make(chan error, 1),
	}, WithLauncher(func(context.Context, []exec.Option) (*exec.StdioProcess, error) {
		return scriptedProcess(state), nil
	}))
	return tool
}

func TestRunPromptCreatesAndResumesSession(t *testing.T) {
	state := &scriptedState{}
	tool := testTool(t, state)
	var messages []string
	tool.OnMessage(func(message *console.AgentMessageAttributes, _ string) {
		if message.Role == console.AiRoleAssistant {
			messages = append(messages, message.Message)
		}
	})

	if err := tool.FollowUpRun(context.Background(), "first"); err != nil {
		t.Fatalf("first prompt: %v", err)
	}
	if err := tool.FollowUpRun(context.Background(), "second"); err != nil {
		t.Fatalf("resumed prompt: %v", err)
	}

	state.mu.Lock()
	defer state.mu.Unlock()
	if len(state.newSessions) != 1 || len(state.resumedSessions) != 1 {
		t.Fatalf("session setup = new %d, resume %d; want one each", len(state.newSessions), len(state.resumedSessions))
	}
	if len(state.prompts) != 2 || state.prompts[0] != "first" || state.prompts[1] != "second" {
		t.Fatalf("prompts = %v", state.prompts)
	}
	if got := state.newSessions[0].Cwd; !filepath.IsAbs(got) {
		t.Fatalf("new session cwd = %q, want absolute", got)
	}
	if got := state.resumedSessions[0].Cwd; !filepath.IsAbs(got) {
		t.Fatalf("resumed session cwd = %q, want absolute", got)
	}
	if len(messages) != 2 {
		t.Fatalf("assistant messages = %v, want two", messages)
	}
	if len(state.initializations) != 2 {
		t.Fatalf("initializations = %d, want one per process", len(state.initializations))
	}
	capabilities := state.initializations[0].ClientCapabilities
	if !capabilities.Fs.ReadTextFile || !capabilities.Fs.WriteTextFile || capabilities.Terminal || capabilities.Auth.Terminal {
		t.Fatal("unexpected ACP capabilities")
	}
}

func TestRunPromptAppliesOpenCodeModelAndModeConfigOptions(t *testing.T) {
	modelOptions := acpsdk.SessionConfigSelectOptions{
		Ungrouped: &acpsdk.SessionConfigSelectOptionsUngrouped{
			{Name: "Default", Value: "provider/default"},
			{Name: "Configured", Value: "provider/configured"},
		},
	}
	modeOptions := acpsdk.SessionConfigSelectOptions{
		Ungrouped: &acpsdk.SessionConfigSelectOptionsUngrouped{
			{Name: "Default", Value: "default"},
			{Name: "Analysis", Value: "analysis"},
		},
	}
	state := &scriptedState{
		configOptions: []acpsdk.SessionConfigOption{
			{Select: &acpsdk.SessionConfigOptionSelect{Id: "model", CurrentValue: "provider/default", Options: modelOptions}},
			{Select: &acpsdk.SessionConfigOptionSelect{Id: "mode", CurrentValue: "default", Options: modeOptions}},
		},
	}
	tool := testTool(t, state)
	tool.model = "provider/configured"
	tool.mode = "analysis"

	if err := tool.FollowUpRun(context.Background(), "configured"); err != nil {
		t.Fatal(err)
	}

	state.mu.Lock()
	defer state.mu.Unlock()
	if len(state.setConfig) != 2 {
		t.Fatalf("config option updates = %d, want model and mode", len(state.setConfig))
	}
	if got := string(state.setConfig[0].ValueId.Value); got != "provider/configured" {
		t.Fatalf("model config value = %q", got)
	}
	if got := string(state.setConfig[1].ValueId.Value); got != "analysis" {
		t.Fatalf("mode config value = %q", got)
	}
	if len(state.setModes) != 0 {
		t.Fatalf("direct mode updates = %d, want config option update", len(state.setModes))
	}
}

func TestRunUsesLifecycleOptionsOnlyForInitialPrompt(t *testing.T) {
	state := &scriptedState{}
	tool := testTool(t, state)
	var launchOptionCounts []int
	tool.launch = func(_ context.Context, options []exec.Option) (*exec.StdioProcess, error) {
		state.mu.Lock()
		launchOptionCounts = append(launchOptionCounts, len(options))
		state.mu.Unlock()
		return scriptedProcess(state), nil
	}
	initialDone := make(chan struct{})
	tool.OnMessage(func(message *console.AgentMessageAttributes, _ string) {
		if message.Role == console.AiRoleAssistant {
			select {
			case <-initialDone:
			default:
				close(initialDone)
			}
		}
	})

	tool.Run(context.Background(), exec.WithArgs([]string{"initial-only"}))
	select {
	case <-initialDone:
	case <-time.After(time.Second):
		t.Fatal("initial prompt did not complete")
	}
	if err := tool.FollowUpRun(context.Background(), "follow-up"); err != nil {
		t.Fatal(err)
	}

	if len(launchOptionCounts) != 2 {
		t.Fatalf("launches = %v, want initial and follow-up", launchOptionCounts)
	}
	if launchOptionCounts[0] != 1 || launchOptionCounts[1] != 0 {
		t.Fatalf("launch option counts = %v, want [1 0]", launchOptionCounts)
	}
}

func TestToolOutputThresholdAndTerminalFlush(t *testing.T) {
	state := &scriptedState{}
	tool := testTool(t, state)
	tool.flushBytes = 3
	var outputs []string
	tool.OnMessage(func(message *console.AgentMessageAttributes, callID string) {
		if callID != "call-1" || message.Metadata == nil || message.Metadata.Tool == nil || message.Metadata.Tool.Output == nil {
			return
		}
		outputs = append(outputs, *message.Metadata.Tool.Output)
	})
	turn := newTurn(tool, "session-1")
	start := acpsdk.StartToolCall("call-1", "shell", acpsdk.WithStartStatus(acpsdk.ToolCallStatusInProgress))
	if err := turn.handle(acpsdk.SessionNotification{SessionId: "session-1", Update: start}); err != nil {
		t.Fatal(err)
	}
	if err := turn.handle(acpsdk.SessionNotification{SessionId: "session-1", Update: acpsdk.UpdateToolCall("call-1", acpsdk.WithUpdateRawOutput("abc"))}); err != nil {
		t.Fatal(err)
	}
	if len(outputs) != 2 || outputs[1] != "abc" {
		t.Fatalf("threshold outputs = %v, want initial and abc", outputs)
	}
	if err := turn.handle(acpsdk.SessionNotification{SessionId: "session-1", Update: acpsdk.UpdateToolCall("call-1", acpsdk.WithUpdateStatus(acpsdk.ToolCallStatusCompleted), acpsdk.WithUpdateRawOutput("done"))}); err != nil {
		t.Fatal(err)
	}
	if len(outputs) != 3 || outputs[2] != "done" {
		t.Fatalf("terminal outputs = %v, want final done snapshot", outputs)
	}
}

func TestToolOutputPrefersContentOverRawOutput(t *testing.T) {
	state := &scriptedState{}
	tool := testTool(t, state)
	var outputs []string
	tool.OnMessage(func(message *console.AgentMessageAttributes, callID string) {
		if callID != "call-1" || message.Metadata == nil || message.Metadata.Tool == nil || message.Metadata.Tool.Output == nil {
			return
		}
		outputs = append(outputs, *message.Metadata.Tool.Output)
	})

	turn := newTurn(tool, "session-1")
	start := acpsdk.StartToolCall("call-1", "shell", acpsdk.WithStartStatus(acpsdk.ToolCallStatusInProgress))
	if err := turn.handle(acpsdk.SessionNotification{SessionId: "session-1", Update: start}); err != nil {
		t.Fatal(err)
	}
	update := acpsdk.UpdateToolCall(
		"call-1",
		acpsdk.WithUpdateStatus(acpsdk.ToolCallStatusCompleted),
		acpsdk.WithUpdateContent([]acpsdk.ToolCallContent{acpsdk.ToolContent(acpsdk.TextBlock("display output"))}),
		acpsdk.WithUpdateRawOutput(map[string]any{"result": "structured output"}),
	)
	if err := turn.handle(acpsdk.SessionNotification{SessionId: "session-1", Update: update}); err != nil {
		t.Fatal(err)
	}

	if len(outputs) != 2 || outputs[1] != "display output" {
		t.Fatalf("outputs = %v, want initial and display output", outputs)
	}
}

func TestToolOutputFallsBackToRawOutputWithoutContent(t *testing.T) {
	state := &scriptedState{}
	tool := testTool(t, state)
	var outputs []string
	tool.OnMessage(func(message *console.AgentMessageAttributes, callID string) {
		if callID != "call-1" || message.Metadata == nil || message.Metadata.Tool == nil || message.Metadata.Tool.Output == nil {
			return
		}
		outputs = append(outputs, *message.Metadata.Tool.Output)
	})

	turn := newTurn(tool, "session-1")
	start := acpsdk.StartToolCall("call-1", "shell", acpsdk.WithStartStatus(acpsdk.ToolCallStatusInProgress))
	if err := turn.handle(acpsdk.SessionNotification{SessionId: "session-1", Update: start}); err != nil {
		t.Fatal(err)
	}
	update := acpsdk.UpdateToolCall(
		"call-1",
		acpsdk.WithUpdateStatus(acpsdk.ToolCallStatusCompleted),
		acpsdk.WithUpdateRawOutput(map[string]any{"result": "structured output"}),
	)
	if err := turn.handle(acpsdk.SessionNotification{SessionId: "session-1", Update: update}); err != nil {
		t.Fatal(err)
	}

	if len(outputs) != 2 || outputs[1] != `{"result":"structured output"}` {
		t.Fatalf("outputs = %v, want initial and structured JSON output", outputs)
	}
}

func TestPromptStopReasonIsFailure(t *testing.T) {
	state := &scriptedState{stopReason: acpsdk.StopReasonRefusal}
	tool := testTool(t, state)
	if err := tool.FollowUpRun(context.Background(), "refuse"); err == nil {
		t.Fatal("refusal stop reason unexpectedly succeeded")
	}
}

func TestRecordCostHandlesCumulativeUpdatesAndReset(t *testing.T) {
	tool := &Tool{}
	for _, test := range []struct {
		name   string
		amount float64
		want   float64
	}{
		{name: "initial", amount: 4, want: 4},
		{name: "increase", amount: 7, want: 3},
		{name: "provider reset", amount: 2, want: 0},
		{name: "after reset", amount: 3, want: 1},
	} {
		t.Run(test.name, func(t *testing.T) {
			if got := tool.recordCost(test.amount); got != test.want {
				t.Fatalf("recordCost(%v) = %v, want %v", test.amount, got, test.want)
			}
		})
	}
}
