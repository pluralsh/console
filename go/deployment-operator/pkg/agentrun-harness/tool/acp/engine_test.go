package acp

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"strings"
	"sync"
	"testing"
	"time"

	acpsdk "github.com/coder/acp-go-sdk"
	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/usage"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
)

type testState struct {
	mu                sync.Mutex
	sessionID         string
	newSessions       []acpsdk.NewSessionRequest
	resumedSessions   []acpsdk.ResumeSessionRequest
	prompts           []string
	initializations   []acpsdk.InitializeRequest
	setConfig         []acpsdk.SetSessionConfigOptionRequest
	setModes          []acpsdk.SetSessionModeRequest
	cancels           []acpsdk.CancelNotification
	newSessionUpdates []acpsdk.SessionNotification
	promptUpdates     []acpsdk.SessionUpdate
	configOptions     []acpsdk.SessionConfigOption
	modes             *acpsdk.SessionModeState
	responseUsage     *acpsdk.Usage
	stopReason        acpsdk.StopReason
	promptStarted     chan struct{}
	promptRelease     chan struct{}
	promptOnce        sync.Once
	protocolVersion   int
}

type testAgent struct {
	state *testState
	conn  *acpsdk.AgentSideConnection
}

func (agent *testAgent) Authenticate(context.Context, acpsdk.AuthenticateRequest) (acpsdk.AuthenticateResponse, error) {
	return acpsdk.AuthenticateResponse{}, nil
}

func (agent *testAgent) Initialize(_ context.Context, request acpsdk.InitializeRequest) (acpsdk.InitializeResponse, error) {
	agent.state.mu.Lock()
	agent.state.initializations = append(agent.state.initializations, request)
	version := agent.state.protocolVersion
	agent.state.mu.Unlock()
	if version == 0 {
		version = acpsdk.ProtocolVersionNumber
	}
	return acpsdk.InitializeResponse{ProtocolVersion: acpsdk.ProtocolVersion(version)}, nil
}

func (agent *testAgent) Logout(context.Context, acpsdk.LogoutRequest) (acpsdk.LogoutResponse, error) {
	return acpsdk.LogoutResponse{}, nil
}

func (agent *testAgent) Cancel(_ context.Context, request acpsdk.CancelNotification) error {
	agent.state.mu.Lock()
	agent.state.cancels = append(agent.state.cancels, request)
	agent.state.mu.Unlock()
	return nil
}

func (agent *testAgent) CloseSession(context.Context, acpsdk.CloseSessionRequest) (acpsdk.CloseSessionResponse, error) {
	return acpsdk.CloseSessionResponse{}, nil
}

func (agent *testAgent) ListSessions(context.Context, acpsdk.ListSessionsRequest) (acpsdk.ListSessionsResponse, error) {
	return acpsdk.ListSessionsResponse{}, nil
}

func (agent *testAgent) NewSession(ctx context.Context, request acpsdk.NewSessionRequest) (acpsdk.NewSessionResponse, error) {
	agent.state.mu.Lock()
	agent.state.newSessions = append(agent.state.newSessions, request)
	updates := append([]acpsdk.SessionNotification(nil), agent.state.newSessionUpdates...)
	sessionID := agent.state.sessionID
	options := append([]acpsdk.SessionConfigOption(nil), agent.state.configOptions...)
	modes := agent.state.modes
	agent.state.mu.Unlock()
	for _, update := range updates {
		if err := agent.conn.SessionUpdate(ctx, update); err != nil {
			return acpsdk.NewSessionResponse{}, err
		}
	}
	return acpsdk.NewSessionResponse{SessionId: acpsdk.SessionId(sessionID), ConfigOptions: options, Modes: modes}, nil
}

func (agent *testAgent) Prompt(ctx context.Context, request acpsdk.PromptRequest) (acpsdk.PromptResponse, error) {
	prompt := ""
	if len(request.Prompt) > 0 && request.Prompt[0].Text != nil {
		prompt = request.Prompt[0].Text.Text
	}
	agent.state.mu.Lock()
	agent.state.prompts = append(agent.state.prompts, prompt)
	updates := append([]acpsdk.SessionUpdate(nil), agent.state.promptUpdates...)
	usageValue := agent.state.responseUsage
	stopReason := agent.state.stopReason
	release := agent.state.promptRelease
	started := agent.state.promptStarted
	agent.state.mu.Unlock()
	if started != nil {
		agent.state.promptOnce.Do(func() { close(started) })
	}
	if release != nil {
		select {
		case <-release:
		case <-ctx.Done():
			return acpsdk.PromptResponse{}, ctx.Err()
		}
	}
	for _, update := range updates {
		if err := agent.conn.SessionUpdate(ctx, acpsdk.SessionNotification{SessionId: request.SessionId, Update: update}); err != nil {
			return acpsdk.PromptResponse{}, err
		}
	}
	if stopReason == "" {
		stopReason = acpsdk.StopReasonEndTurn
	}
	return acpsdk.PromptResponse{StopReason: stopReason, Usage: usageValue}, nil
}

func (agent *testAgent) ResumeSession(_ context.Context, request acpsdk.ResumeSessionRequest) (acpsdk.ResumeSessionResponse, error) {
	agent.state.mu.Lock()
	agent.state.resumedSessions = append(agent.state.resumedSessions, request)
	options := append([]acpsdk.SessionConfigOption(nil), agent.state.configOptions...)
	modes := agent.state.modes
	agent.state.mu.Unlock()
	return acpsdk.ResumeSessionResponse{ConfigOptions: options, Modes: modes}, nil
}

func (agent *testAgent) SetSessionConfigOption(_ context.Context, request acpsdk.SetSessionConfigOptionRequest) (acpsdk.SetSessionConfigOptionResponse, error) {
	agent.state.mu.Lock()
	agent.state.setConfig = append(agent.state.setConfig, request)
	agent.state.mu.Unlock()
	return acpsdk.SetSessionConfigOptionResponse{}, nil
}

func (agent *testAgent) SetSessionMode(_ context.Context, request acpsdk.SetSessionModeRequest) (acpsdk.SetSessionModeResponse, error) {
	agent.state.mu.Lock()
	agent.state.setModes = append(agent.state.setModes, request)
	agent.state.mu.Unlock()
	return acpsdk.SetSessionModeResponse{}, nil
}

type testSink struct {
	mu       sync.Mutex
	events   []string
	sessions []string
	messages []*console.AgentMessageAttributes
	outputs  []string
	usages   []usage.Record
}

func (sink *testSink) Session(sessionID string) {
	sink.mu.Lock()
	sink.sessions = append(sink.sessions, sessionID)
	sink.events = append(sink.events, "session:"+sessionID)
	sink.mu.Unlock()
}

func (sink *testSink) Message(message *console.AgentMessageAttributes, callID string) {
	sink.mu.Lock()
	sink.messages = append(sink.messages, message)
	sink.events = append(sink.events, "message:"+callID+":"+message.Message)
	sink.mu.Unlock()
}

func (sink *testSink) ToolCallOutput(callID, output string) {
	sink.mu.Lock()
	sink.outputs = append(sink.outputs, callID+":"+output)
	sink.events = append(sink.events, "output:"+callID+":"+output)
	sink.mu.Unlock()
}

func (sink *testSink) Usage(record usage.Record) {
	sink.mu.Lock()
	sink.usages = append(sink.usages, record)
	sink.events = append(sink.events, "usage")
	sink.mu.Unlock()
}

type testProcess struct {
	stdinCloseEnds bool
	done           chan struct{}
	finishOnce     sync.Once
	pipeCloseOnce  sync.Once
	stdin          *testWriter
	clientIn       *io.PipeReader
	clientOut      *io.PipeReader
	agentIn        *io.PipeReader
	agentOut       *io.PipeWriter
	kills          int
	mu             sync.Mutex
}

type testWriter struct {
	*io.PipeWriter
	process *testProcess
}

func (writer *testWriter) Close() error {
	err := writer.PipeWriter.Close()
	if writer.process.stdinCloseEnds {
		writer.process.finish()
	}
	return err
}

func (process *testProcess) finish() {
	process.finishOnce.Do(func() { close(process.done) })
}

func (process *testProcess) closePipes() {
	process.pipeCloseOnce.Do(func() {
		_ = process.clientIn.Close()
		_ = process.clientOut.Close()
		_ = process.agentIn.Close()
		_ = process.agentOut.Close()
	})
}

func (process *testProcess) wait() error {
	<-process.done
	process.closePipes()
	return nil
}

func (process *testProcess) kill() error {
	process.mu.Lock()
	process.kills++
	process.mu.Unlock()
	process.finish()
	process.closePipes()
	return nil
}

func (process *testProcess) close() error {
	process.finish()
	process.closePipes()
	return nil
}

func newTestProcess(agent *testAgent, stdinCloseEnds bool) (*testProcess, *exec.StdioProcess) {
	clientToAgentReader, clientToAgentWriter := io.Pipe()
	agentToClientReader, agentToClientWriter := io.Pipe()
	process := &testProcess{
		stdinCloseEnds: stdinCloseEnds,
		done:           make(chan struct{}),
		clientIn:       clientToAgentReader,
		clientOut:      agentToClientReader,
		agentIn:        clientToAgentReader,
		agentOut:       agentToClientWriter,
	}
	process.stdin = &testWriter{PipeWriter: clientToAgentWriter, process: process}
	agent.conn = acpsdk.NewAgentSideConnection(agent, agentToClientWriter, clientToAgentReader)
	agent.conn.SetLogger(slog.New(slog.NewTextHandler(io.Discard, nil)))
	stdio := exec.NewStdioProcess(process.stdin, agentToClientReader, io.NopCloser(strings.NewReader("")), exec.StdioProcessHooks{
		Wait:  process.wait,
		Kill:  process.kill,
		Stop:  process.kill,
		Close: process.close,
	})
	return process, stdio
}

func newTestState() *testState {
	return &testState{sessionID: "session-1", promptStarted: make(chan struct{})}
}

func newTestAgentProcess(state *testState, stdinCloseEnds bool) (*testState, *exec.StdioProcess, *testProcess) {
	agent := &testAgent{state: state}
	process, stdio := newTestProcess(agent, stdinCloseEnds)
	return state, stdio, process
}

func (state *testState) snapshot() (newCount, resumeCount, promptCount, configCount, modeCount, cancelCount int, prompts []string) {
	state.mu.Lock()
	defer state.mu.Unlock()
	return len(state.newSessions), len(state.resumedSessions), len(state.prompts), len(state.setConfig), len(state.setModes), len(state.cancels), append([]string(nil), state.prompts...)
}

func (state *testState) configValues() (model, mode string) {
	state.mu.Lock()
	defer state.mu.Unlock()
	if len(state.setConfig) > 0 && state.setConfig[0].ValueId != nil {
		model = string(state.setConfig[0].ValueId.Value)
	}
	if len(state.setConfig) > 1 && state.setConfig[1].ValueId != nil {
		mode = string(state.setConfig[1].ValueId.Value)
	}
	return model, mode
}

func (process *testProcess) killCount() int {
	process.mu.Lock()
	defer process.mu.Unlock()
	return process.kills
}

func TestEngineTurnCreatesAndResumesSession(t *testing.T) {
	state := newTestState()
	engine := NewEngine(Config{StopTimeout: time.Second})
	firstSink := &testSink{}
	_, firstProcess, _ := newTestAgentProcess(state, true)
	first, err := engine.Turn(context.Background(), firstProcess, Request{Cwd: t.TempDir(), Prompt: "first"}, firstSink)
	if err != nil {
		t.Fatalf("create turn: %v", err)
	}
	secondSink := &testSink{}
	_, secondProcess, _ := newTestAgentProcess(state, true)
	second, err := engine.Turn(context.Background(), secondProcess, Request{Cwd: t.TempDir(), Prompt: "second", SessionID: first.SessionID}, secondSink)
	if err != nil {
		t.Fatalf("resume turn: %v", err)
	}
	newCount, resumeCount, promptCount, _, _, _, prompts := state.snapshot()
	if newCount != 1 || resumeCount != 1 || promptCount != 2 || second.SessionID != first.SessionID {
		t.Fatalf("sessions = new %d resume %d prompts %d result %q", newCount, resumeCount, promptCount, second.SessionID)
	}
	if strings.Join(prompts, ",") != "first,second" {
		t.Fatalf("prompts = %v", prompts)
	}
}

func TestEngineTurnAppliesModelAndModeConfig(t *testing.T) {
	state := newTestState()
	state.configOptions = []acpsdk.SessionConfigOption{
		{Select: &acpsdk.SessionConfigOptionSelect{Id: "model", CurrentValue: "default", Options: acpsdk.SessionConfigSelectOptions{Ungrouped: &acpsdk.SessionConfigSelectOptionsUngrouped{{Value: "default"}, {Value: "configured"}}}}},
		{Select: &acpsdk.SessionConfigOptionSelect{Id: "mode", CurrentValue: "default", Options: acpsdk.SessionConfigSelectOptions{Ungrouped: &acpsdk.SessionConfigSelectOptionsUngrouped{{Value: "default"}, {Value: "analysis"}}}}},
	}
	engine := NewEngine(Config{})
	_, process, _ := newTestAgentProcess(state, true)
	_, err := engine.Turn(context.Background(), process, Request{Cwd: t.TempDir(), Prompt: "configure", Settings: SessionSettings{ModelID: "configured", ModeID: "analysis"}}, &testSink{})
	if err != nil {
		t.Fatalf("configured turn: %v", err)
	}
	model, mode := state.configValues()
	if model != "configured" || mode != "analysis" {
		t.Fatalf("config values = %q, %q", model, mode)
	}
}

func TestEngineTurnStreamsMessagesToolsUsageAndOrdering(t *testing.T) {
	state := newTestState()
	cached, thought := 2, 3
	state.responseUsage = &acpsdk.Usage{InputTokens: 10, OutputTokens: 5, CachedReadTokens: &cached, ThoughtTokens: &thought}
	state.promptUpdates = []acpsdk.SessionUpdate{
		acpsdk.UpdateAgentMessageText("hello "),
		acpsdk.UpdateAgentThoughtText("thinking"),
		acpsdk.StartToolCall("call-1", "shell", acpsdk.WithStartStatus(acpsdk.ToolCallStatusInProgress), acpsdk.WithStartContent([]acpsdk.ToolCallContent{acpsdk.ToolContent(acpsdk.TextBlock("first"))})),
		acpsdk.UpdateToolCall("call-1", acpsdk.WithUpdateContent([]acpsdk.ToolCallContent{acpsdk.ToolContent(acpsdk.TextBlock("first\nsecond"))})),
		acpsdk.UpdateToolCall("call-1", acpsdk.WithUpdateStatus(acpsdk.ToolCallStatusCompleted), acpsdk.WithUpdateContent([]acpsdk.ToolCallContent{acpsdk.ToolContent(acpsdk.TextBlock("first\nsecond\nfinal"))})),
		acpsdk.UpdateAgentMessageText("done"),
	}
	state.promptUpdates = append(state.promptUpdates, acpsdk.SessionUpdate{UsageUpdate: &acpsdk.SessionUsageUpdate{Cost: &acpsdk.Cost{Amount: 4}}})
	state.promptUpdates = append(state.promptUpdates, acpsdk.SessionUpdate{UsageUpdate: &acpsdk.SessionUsageUpdate{Cost: &acpsdk.Cost{Amount: 7}}})
	sink := &testSink{}
	_, process, _ := newTestAgentProcess(state, true)
	if _, err := NewEngine(Config{}).Turn(context.Background(), process, Request{Cwd: t.TempDir(), Prompt: "stream"}, sink); err != nil {
		t.Fatalf("streaming turn: %v", err)
	}
	sink.mu.Lock()
	events := append([]string(nil), sink.events...)
	usages := append([]usage.Record(nil), sink.usages...)
	messages := append([]*console.AgentMessageAttributes(nil), sink.messages...)
	sink.mu.Unlock()
	if len(messages) < 3 || messages[len(messages)-1].Message != "hello done" {
		t.Fatalf("messages = %+v", messages)
	}
	if messages[len(messages)-1].Cost == nil || messages[len(messages)-1].Cost.Total != 7 {
		t.Fatalf("assistant cumulative cost = %+v", messages[len(messages)-1].Cost)
	}
	want := []string{"output:call-1:first", "output:call-1:first\nsecond", "output:call-1:first\nsecond\nfinal"}
	for _, event := range want {
		found := false
		for _, got := range events {
			if got == event {
				found = true
				break
			}
		}
		if !found {
			t.Fatalf("events = %v, missing %q", events, event)
		}
	}
	if len(usages) != 3 || usages[0].TotalCost != 4 || usages[1].TotalCost != 3 || usages[2].InputTokens != 10 || usages[2].TotalTokens != 18 {
		t.Fatalf("usage events = %+v", usages)
	}
	startMessage, terminalMessage, firstOutput, secondOutput := -1, -1, -1, -1
	for i, event := range events {
		switch event {
		case "message:call-1:Called tool":
			if startMessage == -1 {
				startMessage = i
			} else {
				terminalMessage = i
			}
		case "output:call-1:first":
			firstOutput = i
		case "output:call-1:first\nsecond":
			secondOutput = i
		}
	}
	if startMessage < 0 || firstOutput < startMessage || secondOutput < firstOutput || terminalMessage < secondOutput {
		t.Fatalf("tool events are out of order: %v", events)
	}
}

func TestEngineTurnRejectsMismatchedEarlyBinding(t *testing.T) {
	state := newTestState()
	state.newSessionUpdates = []acpsdk.SessionNotification{{SessionId: "other", Update: acpsdk.UpdateAgentMessageText("wrong")}}
	_, process, _ := newTestAgentProcess(state, true)
	_, err := NewEngine(Config{}).Turn(context.Background(), process, Request{Cwd: t.TempDir(), Prompt: "mismatch"}, &testSink{})
	if err == nil || !strings.Contains(err.Error(), `belongs to session "other"`) {
		t.Fatalf("mismatch error = %v", err)
	}
}

func TestEngineTurnCancellationKillsUncooperativeProcess(t *testing.T) {
	state := newTestState()
	state.promptRelease = make(chan struct{})
	ctx, cancel := context.WithCancel(context.Background())
	processState, process, processFixture := newTestAgentProcess(state, false)
	startedAt := time.Now()
	result := make(chan error, 1)
	go func() {
		_, err := NewEngine(Config{StopTimeout: 20 * time.Millisecond}).Turn(ctx, process, Request{Cwd: t.TempDir(), Prompt: "cancel"}, &testSink{})
		result <- err
	}()
	select {
	case <-processState.promptStarted:
		cancel()
	case <-time.After(time.Second):
		t.Fatal("prompt did not start")
	}
	select {
	case err := <-result:
		if !errors.Is(err, context.Canceled) {
			t.Fatalf("cancellation error = %v", err)
		}
		if time.Since(startedAt) > 500*time.Millisecond {
			t.Fatalf("canceled turn exceeded bounded shutdown: %v", time.Since(startedAt))
		}
	case <-time.After(time.Second):
		t.Fatal("canceled turn did not stop")
	}
	if processFixture.killCount() == 0 {
		t.Fatal("cancellation did not kill an uncooperative process")
	}
	_, _, _, _, _, cancelCount, _ := processState.snapshot()
	if cancelCount == 0 {
		t.Fatal("cancellation did not send session/cancel")
	}
}
