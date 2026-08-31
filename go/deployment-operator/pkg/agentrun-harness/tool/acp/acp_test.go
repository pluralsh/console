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

func TestToolOutputEmitsAccumulatedStdout(t *testing.T) {
	state := &scriptedState{}
	tool := testTool(t, state)
	var outputs []string
	tool.OnOutput(func(callID, stdout string) {
		if callID == "call-1" {
			outputs = append(outputs, stdout)
		}
	})

	turn := newTurn(tool, "session-1")
	start := acpsdk.StartToolCall(
		"call-1",
		"shell",
		acpsdk.WithStartStatus(acpsdk.ToolCallStatusInProgress),
		acpsdk.WithStartContent([]acpsdk.ToolCallContent{acpsdk.ToolContent(acpsdk.TextBlock("first"))}),
	)
	if err := turn.handle(acpsdk.SessionNotification{SessionId: "session-1", Update: start}); err != nil {
		t.Fatal(err)
	}
	updates := []acpsdk.SessionNotification{
		{SessionId: "session-1", Update: acpsdk.UpdateToolCall("call-1", acpsdk.WithUpdateContent([]acpsdk.ToolCallContent{acpsdk.ToolContent(acpsdk.TextBlock("first\nsecond"))}))},
		{SessionId: "session-1", Update: acpsdk.UpdateToolCall("call-1", acpsdk.WithUpdateStatus(acpsdk.ToolCallStatusCompleted), acpsdk.WithUpdateContent([]acpsdk.ToolCallContent{acpsdk.ToolContent(acpsdk.TextBlock("first\nsecond\nfinal"))}))},
	}
	for _, update := range updates {
		if err := turn.handle(update); err != nil {
			t.Fatal(err)
		}
	}

	want := []string{"first", "first\nsecond", "first\nsecond\nfinal"}
	if len(outputs) != len(want) {
		t.Fatalf("output callbacks = %v, want %v", outputs, want)
	}
	for i := range want {
		if outputs[i] != want[i] {
			t.Fatalf("output callback %d = %q, want %q", i, outputs[i], want[i])
		}
	}
}

func TestToolNonterminalMessagesTrackMeaningfulMetadataChanges(t *testing.T) {
	state := &scriptedState{}
	tool := testTool(t, state)
	var messages []*console.AgentMessageAttributes
	tool.OnMessage(func(message *console.AgentMessageAttributes, callID string) {
		if callID == "call-1" {
			messages = append(messages, message)
		}
	})

	turn := newTurn(tool, "session-1")
	start := acpsdk.StartToolCall("call-1", "shell", acpsdk.WithStartStatus(acpsdk.ToolCallStatusInProgress))
	if err := turn.handle(acpsdk.SessionNotification{SessionId: "session-1", Update: start}); err != nil {
		t.Fatal(err)
	}
	updates := []acpsdk.SessionNotification{
		{SessionId: "session-1", Update: acpsdk.UpdateToolCall("call-1", acpsdk.WithUpdateRawOutput("output-only"))},
		{SessionId: "session-1", Update: acpsdk.UpdateToolCall("call-1", acpsdk.WithUpdateTitle("renamed"))},
		{SessionId: "session-1", Update: acpsdk.UpdateToolCall("call-1", acpsdk.WithUpdateTitle("renamed"))},
		{SessionId: "session-1", Update: acpsdk.UpdateToolCall("call-1", acpsdk.WithUpdateRawInput(map[string]string{"command": "ls"}))},
		{SessionId: "session-1", Update: acpsdk.UpdateToolCall("call-1", acpsdk.WithUpdateRawInput(map[string]string{"command": "ls"}))},
		{SessionId: "session-1", Update: acpsdk.UpdateToolCall("call-1", acpsdk.WithUpdateStatus(acpsdk.ToolCallStatusPending))},
		{SessionId: "session-1", Update: acpsdk.UpdateToolCall("call-1", acpsdk.WithUpdateStatus(acpsdk.ToolCallStatusPending))},
	}
	for _, update := range updates {
		if err := turn.handle(update); err != nil {
			t.Fatal(err)
		}
	}

	if len(messages) != 4 {
		t.Fatalf("nonterminal messages = %d, want start plus three metadata changes", len(messages))
	}
	if got := *messages[1].Metadata.Tool.Name; got != "renamed" {
		t.Fatalf("title update = %q, want renamed", got)
	}
	if got := *messages[2].Metadata.Tool.Input; got != "{\"command\":\"ls\"}" {
		t.Fatalf("input update = %q, want command input", got)
	}
	if got := *messages[3].Metadata.Tool.State; got != console.AgentMessageToolStatePending {
		t.Fatalf("status update = %q, want pending", got)
	}
}

func TestToolOutputOnlyUpdatesDoNotRewriteMessage(t *testing.T) {
	state := &scriptedState{}
	tool := testTool(t, state)
	var messages []*console.AgentMessageAttributes
	var outputs []string
	tool.OnMessage(func(message *console.AgentMessageAttributes, callID string) {
		if callID == "call-1" {
			messages = append(messages, message)
		}
	})
	tool.OnOutput(func(callID, stdout string) {
		if callID == "call-1" {
			outputs = append(outputs, stdout)
		}
	})

	turn := newTurn(tool, "session-1")
	start := acpsdk.StartToolCall("call-1", "shell", acpsdk.WithStartStatus(acpsdk.ToolCallStatusInProgress))
	if err := turn.handle(acpsdk.SessionNotification{SessionId: "session-1", Update: start}); err != nil {
		t.Fatal(err)
	}
	for _, output := range []string{"first", "first\nsecond"} {
		update := acpsdk.UpdateToolCall("call-1", acpsdk.WithUpdateRawOutput(output))
		if err := turn.handle(acpsdk.SessionNotification{SessionId: "session-1", Update: update}); err != nil {
			t.Fatal(err)
		}
	}

	if len(messages) != 1 {
		t.Fatalf("output-only messages = %d, want start message only", len(messages))
	}
	if len(outputs) != 2 || outputs[0] != "first" || outputs[1] != "first\nsecond" {
		t.Fatalf("output snapshots = %v, want [first first\\nsecond]", outputs)
	}
}

func TestToolStartFallsBackToRawOutput(t *testing.T) {
	state := &scriptedState{}
	tool := testTool(t, state)
	var messageOutput string
	var streamedOutput string
	tool.OnMessage(func(message *console.AgentMessageAttributes, callID string) {
		if callID == "call-1" && message.Metadata != nil && message.Metadata.Tool != nil && message.Metadata.Tool.Output != nil {
			messageOutput = *message.Metadata.Tool.Output
		}
	})
	tool.OnOutput(func(callID, stdout string) {
		if callID == "call-1" {
			streamedOutput = stdout
		}
	})

	turn := newTurn(tool, "session-1")
	start := acpsdk.StartToolCall(
		"call-1",
		"shell",
		acpsdk.WithStartStatus(acpsdk.ToolCallStatusInProgress),
		acpsdk.WithStartRawOutput(map[string]string{"result": "structured output"}),
	)
	if err := turn.handle(acpsdk.SessionNotification{SessionId: "session-1", Update: start}); err != nil {
		t.Fatal(err)
	}

	want := "{\"result\":\"structured output\"}"
	if messageOutput != want {
		t.Fatalf("start message output = %q, want %q", messageOutput, want)
	}
	if streamedOutput != want {
		t.Fatalf("start streamed output = %q, want %q", streamedOutput, want)
	}
}

func TestToolOutputCallbackOrdering(t *testing.T) {
	state := &scriptedState{}
	tool := testTool(t, state)
	var events []string
	tool.OnMessage(func(message *console.AgentMessageAttributes, callID string) {
		state := "message"
		if message.Metadata != nil && message.Metadata.Tool != nil && message.Metadata.Tool.State != nil {
			state = string(*message.Metadata.Tool.State)
		}
		events = append(events, state+":"+callID)
	})
	tool.OnOutput(func(callID, stdout string) {
		events = append(events, "output:"+callID+":"+stdout)
	})

	turn := newTurn(tool, "session-1")
	start := acpsdk.StartToolCall(
		"call-1",
		"shell",
		acpsdk.WithStartStatus(acpsdk.ToolCallStatusInProgress),
		acpsdk.WithStartContent([]acpsdk.ToolCallContent{acpsdk.ToolContent(acpsdk.TextBlock("start"))}),
	)
	if err := turn.handle(acpsdk.SessionNotification{SessionId: "session-1", Update: start}); err != nil {
		t.Fatal(err)
	}
	terminal := acpsdk.UpdateToolCall(
		"call-1",
		acpsdk.WithUpdateStatus(acpsdk.ToolCallStatusCompleted),
		acpsdk.WithUpdateContent([]acpsdk.ToolCallContent{acpsdk.ToolContent(acpsdk.TextBlock("start\nterminal"))}),
	)
	if err := turn.handle(acpsdk.SessionNotification{SessionId: "session-1", Update: terminal}); err != nil {
		t.Fatal(err)
	}

	want := []string{
		"RUNNING:call-1",
		"output:call-1:start",
		"output:call-1:start\nterminal",
		"COMPLETED:call-1",
	}
	if len(events) != len(want) {
		t.Fatalf("callback events = %v, want %v", events, want)
	}
	for i := range want {
		if events[i] != want[i] {
			t.Fatalf("callback event %d = %q, want %q", i, events[i], want[i])
		}
	}
}

func TestToolOutputSkipsNonMonotonicSnapshots(t *testing.T) {
	state := &scriptedState{}
	tool := testTool(t, state)
	var outputs []string
	var terminalOutput string
	tool.OnOutput(func(callID, stdout string) {
		if callID == "call-1" {
			outputs = append(outputs, stdout)
		}
	})
	tool.OnMessage(func(message *console.AgentMessageAttributes, callID string) {
		if callID != "call-1" || message.Metadata == nil || message.Metadata.Tool == nil || message.Metadata.Tool.State == nil || *message.Metadata.Tool.State != console.AgentMessageToolStateCompleted {
			return
		}
		if message.Metadata.Tool.Output != nil {
			terminalOutput = *message.Metadata.Tool.Output
		}
	})

	turn := newTurn(tool, "session-1")
	start := acpsdk.StartToolCall("call-1", "shell", acpsdk.WithStartStatus(acpsdk.ToolCallStatusInProgress))
	if err := turn.handle(acpsdk.SessionNotification{SessionId: "session-1", Update: start}); err != nil {
		t.Fatal(err)
	}
	updates := []acpsdk.SessionNotification{
		{SessionId: "session-1", Update: acpsdk.UpdateToolCall("call-1", acpsdk.WithUpdateRawOutput("abc"))},
		{SessionId: "session-1", Update: acpsdk.UpdateToolCall("call-1", acpsdk.WithUpdateRawOutput("done"))},
		{SessionId: "session-1", Update: acpsdk.UpdateToolCall("call-1", acpsdk.WithUpdateStatus(acpsdk.ToolCallStatusCompleted), acpsdk.WithUpdateRawOutput("ab"))},
	}
	for _, update := range updates {
		if err := turn.handle(update); err != nil {
			t.Fatal(err)
		}
	}

	if len(outputs) != 1 || outputs[0] != "abc" {
		t.Fatalf("output callbacks = %v, want [abc]", outputs)
	}
	if terminalOutput != "ab" {
		t.Fatalf("terminal metadata output = %q, want ab", terminalOutput)
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

func TestNewInitializesUsageForCumulativeCostUpdates(t *testing.T) {
	tool := New(toolv1.Config{})
	if tool.Config.Usage == nil {
		t.Fatal("ACP tool did not initialize usage")
	}

	var message *console.AgentMessageAttributes
	tool.OnMessage(func(got *console.AgentMessageAttributes, _ string) {
		message = got
	})
	turn := newTurn(tool, "session-1")
	turn.usageUpdate(&acpsdk.SessionUsageUpdate{Cost: &acpsdk.Cost{Amount: 4}})
	turn.emitAssistant(nil)

	attrs := tool.Config.Usage.Attributes()
	if attrs == nil || attrs.TotalCost == nil || *attrs.TotalCost != 4 {
		t.Fatalf("recorded total cost = %v, want 4", attrs)
	}
	if message == nil || message.Cost == nil || message.Cost.Total != 4 {
		t.Fatalf("assistant cost = %v, want 4", message)
	}
}

func TestNewPreservesProvidedUsage(t *testing.T) {
	provided := usage.New(nil)
	tool := New(toolv1.Config{Usage: provided})

	if tool.Config.Usage != provided {
		t.Fatal("ACP tool replaced the provided usage recorder")
	}
}
