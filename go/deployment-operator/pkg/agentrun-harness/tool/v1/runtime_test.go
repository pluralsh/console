package v1

import (
	"context"
	"errors"
	"os"
	stdexec "os/exec"
	"path/filepath"
	"sync"
	"testing"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/artifacts"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/usage"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
)

type runtimeTestAgent struct {
	settings Settings
	modes    []console.AgentRunMode

	mu           sync.Mutex
	prepare      []FileSystemRequest
	configure    []ConfigureRequest
	export       ExportRequest
	exportCalls  int
	resolveCalls int
}

func (agent *runtimeTestAgent) Prepare(_ context.Context, request FileSystemRequest) error {
	agent.mu.Lock()
	agent.prepare = append(agent.prepare, request)
	agent.mu.Unlock()
	return nil
}

func (*runtimeTestAgent) Type() console.AgentRuntimeType { return console.AgentRuntimeTypeOpencode }

func (agent *runtimeTestAgent) Capabilities() AgentCapabilities {
	modes := agent.modes
	if len(modes) == 0 {
		modes = []console.AgentRunMode{
			console.AgentRunModeAnalyze,
			console.AgentRunModeWrite,
			console.AgentRunModeReview,
		}
	}
	return AgentCapabilities{Modes: modes}
}

func (agent *runtimeTestAgent) ResolveSettings(*agentrunv1.AgentRun) (Settings, error) {
	agent.mu.Lock()
	agent.resolveCalls++
	agent.mu.Unlock()
	return agent.settings, nil
}

func (agent *runtimeTestAgent) Configure(_ context.Context, request ConfigureRequest) error {
	agent.mu.Lock()
	agent.configure = append(agent.configure, request)
	agent.mu.Unlock()
	return nil
}

func (agent *runtimeTestAgent) Export(_ context.Context, request ExportRequest) (ExportResult, error) {
	agent.mu.Lock()
	agent.export = request
	agent.exportCalls++
	agent.mu.Unlock()
	if err := os.WriteFile(filepath.Join(request.OutputDir, "session.json"), []byte("{}"), 0644); err != nil {
		return ExportResult{}, err
	}
	return ExportResult{SessionSource: artifacts.SessionSource{
		Path:        request.OutputDir,
		ArchivePath: "session",
	}}, nil
}

type runtimeTestTurn struct {
	kind      TurnKind
	prompt    string
	sessionID string
	options   []exec.Option
}

type runtimeTestTransport struct {
	mu           sync.Mutex
	turns        []runtimeTestTurn
	results      []TurnResult
	errors       []error
	active       int
	maxActive    int
	onTurn       func()
	afterSession func()
	completed    chan struct{}
}

func (*runtimeTestTransport) Kind() TransportKind { return TransportKindRaw }

func (*runtimeTestTransport) Capabilities() TransportCapabilities {
	return TransportCapabilities{
		SessionResume:           true,
		ToolCallOutputStreaming: true,
		UsageReporting:          true,
		FileSystemRead:          true,
		FileSystemWrite:         true,
	}
}

func (transport *runtimeTestTransport) Turn(_ context.Context, request TurnRequest, sink TurnSink) (TurnResult, error) {
	transport.mu.Lock()
	transport.turns = append(transport.turns, runtimeTestTurn{
		kind:      request.Kind,
		prompt:    request.Prompt,
		sessionID: request.SessionID,
		options:   request.Options,
	})
	transport.active++
	if transport.active > transport.maxActive {
		transport.maxActive = transport.active
	}
	onTurn := transport.onTurn
	index := len(transport.turns) - 1
	result := TurnResult{}
	if index < len(transport.results) {
		result = transport.results[index]
	}
	var turnErr error
	if index < len(transport.errors) {
		turnErr = transport.errors[index]
	}
	transport.mu.Unlock()

	if result.SessionID != "" {
		sink.Session(result.SessionID)
	}
	if transport.afterSession != nil {
		transport.afterSession()
	}
	if onTurn != nil {
		onTurn()
	}
	sink.Message(&console.AgentMessageAttributes{Message: "assistant", Role: console.AiRoleAssistant}, "")
	sink.ToolCallOutput("call", "output")
	sink.Usage(usage.Record{InputTokens: 1, OutputTokens: 2, TotalTokens: 3})

	transport.mu.Lock()
	transport.active--
	transport.mu.Unlock()
	if transport.completed != nil {
		transport.completed <- struct{}{}
	}
	return result, turnErr
}

func TestRuntimeSessionEventEnablesLifecycleArtifactHook(t *testing.T) {
	workDir := t.TempDir()
	if err := stdexec.Command("git", "init", workDir).Run(); err != nil {
		t.Fatal(err)
	}
	agent := &runtimeTestAgent{settings: Settings{Mode: console.AgentRunModeWrite}}
	transport := &runtimeTestTransport{
		completed: make(chan struct{}, 1),
		results:   []TurnResult{{SessionID: "session-before-wait"}},
	}
	runtime, err := NewRuntime(runtimeTestConfig(workDir, make(chan error, 1)), agent, transport)
	if err != nil {
		t.Fatal(err)
	}
	hookResult := make(chan error, 1)
	transport.afterSession = func() {
		_, err := runtime.UploadArtifacts(context.Background())
		hookResult <- err
	}
	runtime.Run(context.Background())
	<-transport.completed
	if err := <-hookResult; err != nil {
		t.Fatalf("lifecycle artifact hook before Turn return failed: %v", err)
	}
}

func runtimeTestConfig(workDir string, errors chan error) Config {
	return Config{
		WorkDir:       workDir,
		RepositoryDir: workDir,
		ErrorChan:     errors,
		Run: &agentrunv1.AgentRun{
			ID:     "run-1",
			Prompt: "initial prompt",
			Mode:   console.AgentRunModeWrite,
		},
	}
}

func newRuntimeTest(t *testing.T, transport *runtimeTestTransport) (*Runtime, *runtimeTestAgent, chan error) {
	t.Helper()
	errors := make(chan error, 4)
	agent := &runtimeTestAgent{settings: Settings{Mode: console.AgentRunModeWrite}}
	runtime, err := NewRuntime(runtimeTestConfig(t.TempDir(), errors), agent, transport)
	if err != nil {
		t.Fatalf("NewRuntime() error = %v", err)
	}
	return runtime, agent, errors
}

func TestRuntimeLifecycleAndErrorRouting(t *testing.T) {
	turnErr := errors.New("babysit failed")
	transport := &runtimeTestTransport{
		completed: make(chan struct{}, 3),
		results: []TurnResult{
			{SessionID: "session-initial"},
			{SessionID: "session-babysit"},
			{SessionID: ""},
		},
		errors: []error{nil, turnErr, nil},
	}
	runtime, agent, errorChan := newRuntimeTest(t, transport)

	var messages []string
	var outputs []string
	runtime.OnMessage(func(message *console.AgentMessageAttributes, _ string) {
		messages = append(messages, message.Message)
	})
	runtime.OnOutput(func(_, output string) {
		outputs = append(outputs, output)
	})

	runtime.Run(context.Background(), exec.WithArgs([]string{"--test"}))
	<-transport.completed

	if err := runtime.Configure("https://console.example", "secret"); err != nil {
		t.Fatalf("Configure() error = %v", err)
	}
	if err := runtime.ConfigureBabysitRun(); err != nil {
		t.Fatalf("ConfigureBabysitRun() error = %v", err)
	}
	runtime.BabysitRun(context.Background(), &BabysitContext{Prompt: "babysit prompt"})
	<-transport.completed
	if err := <-errorChan; !errors.Is(err, turnErr) {
		t.Fatalf("babysit error = %v, want %v", err, turnErr)
	}
	if err := runtime.FollowUpRun(context.Background(), "follow-up prompt"); err != nil {
		t.Fatalf("FollowUpRun() error = %v", err)
	}
	<-transport.completed

	transport.mu.Lock()
	turns := append([]runtimeTestTurn(nil), transport.turns...)
	transport.mu.Unlock()
	if len(turns) != 3 {
		t.Fatalf("turn count = %d, want 3", len(turns))
	}
	if turns[0].kind != TurnKindInitial || turns[1].kind != TurnKindBabysit || turns[2].kind != TurnKindFollowup {
		t.Fatalf("turn kinds = %#v", turns)
	}
	if turns[2].sessionID != "session-babysit" {
		t.Fatalf("follow-up session ID = %q, want session-babysit", turns[2].sessionID)
	}
	if turns[0].prompt != "initial prompt" || turns[1].prompt != "babysit prompt" || turns[2].prompt != "follow-up prompt" {
		t.Fatalf("turn prompts = %#v", turns)
	}
	if len(messages) != 5 || messages[0] != "initial prompt" || messages[1] != "assistant" || messages[2] != "babysit prompt" || messages[3] != "assistant" || messages[4] != "assistant" {
		t.Fatalf("messages = %#v", messages)
	}
	if len(outputs) != 3 {
		t.Fatalf("outputs = %#v, want one per turn", outputs)
	}
	if got := runtime.Config.Usage.Attributes(); got == nil || *got.TotalTokens != 9 {
		t.Fatalf("usage = %#v, want total tokens 9", got)
	}
	if len(agent.configure) != 2 || agent.configure[0].Phase != ConfigurePhaseInitial || agent.configure[1].Phase != ConfigurePhaseBabysit {
		t.Fatalf("configure phases = %#v", agent.configure)
	}
	if agent.configure[0].ConsoleToken != "secret" || agent.configure[1].ConsoleToken != "" {
		t.Fatalf("configure credentials were not phase scoped: %#v", agent.configure)
	}
}

func TestRuntimeInitialErrorRetainsSessionID(t *testing.T) {
	turnErr := errors.New("initial failed")
	transport := &runtimeTestTransport{
		completed: make(chan struct{}, 2),
		results:   []TurnResult{{SessionID: "session-after-error"}},
		errors:    []error{turnErr},
	}
	runtime, _, errorChan := newRuntimeTest(t, transport)
	runtime.Run(context.Background())
	<-transport.completed
	if err := <-errorChan; !errors.Is(err, turnErr) {
		t.Fatalf("Run() error = %v, want %v", err, turnErr)
	}
	if err := runtime.FollowUpRun(context.Background(), "follow-up"); err != nil {
		t.Fatalf("FollowUpRun() error = %v", err)
	}
	transport.mu.Lock()
	defer transport.mu.Unlock()
	if got := transport.turns[1].sessionID; got != "session-after-error" {
		t.Fatalf("session ID after failed initial turn = %q", got)
	}
}

func TestRuntimeSerializesTurns(t *testing.T) {
	transport := &runtimeTestTransport{}
	started := make(chan struct{})
	release := make(chan struct{})
	var once sync.Once
	transport.onTurn = func() {
		once.Do(func() { close(started) })
		<-release
	}
	runtime, _, _ := newRuntimeTest(t, transport)

	firstDone := make(chan error, 1)
	go func() { firstDone <- runtime.FollowUpRun(context.Background(), "first") }()
	<-started
	secondDone := make(chan bool, 1)
	go func() { secondDone <- runtime.BabysitRun(context.Background(), &BabysitContext{Prompt: "second"}) }()
	close(release)
	if err := <-firstDone; err != nil {
		t.Fatalf("first turn error = %v", err)
	}
	<-secondDone
	transport.mu.Lock()
	defer transport.mu.Unlock()
	if transport.maxActive != 1 {
		t.Fatalf("max concurrent turns = %d, want 1", transport.maxActive)
	}
}

func TestAgentCapabilitiesSupports(t *testing.T) {
	capabilities := AgentCapabilities{Modes: []console.AgentRunMode{console.AgentRunModeAnalyze, console.AgentRunModeReview}}
	if !capabilities.Supports(console.AgentRunModeAnalyze) || !capabilities.Supports(console.AgentRunModeReview) {
		t.Fatal("expected advertised modes to be supported")
	}
	if capabilities.Supports(console.AgentRunModeWrite) {
		t.Fatal("did not expect unadvertised mode to be supported")
	}
}

func TestNewRuntimeValidatesInputsBeforeResolvingSettings(t *testing.T) {
	agent := &runtimeTestAgent{settings: Settings{Mode: console.AgentRunModeWrite}}
	transport := &runtimeTestTransport{}

	if _, err := NewRuntime(Config{}, agent, transport); err == nil {
		t.Fatal("NewRuntime() unexpectedly accepted a nil AgentRun")
	}
	if agent.resolveCalls != 0 {
		t.Fatalf("ResolveSettings() calls = %d, want 0 for invalid config", agent.resolveCalls)
	}

	config := runtimeTestConfig(t.TempDir(), make(chan error, 1))
	if _, err := NewRuntime(config, agent, nil); err == nil {
		t.Fatal("NewRuntime() unexpectedly accepted a nil Transport")
	}
	if agent.resolveCalls != 0 {
		t.Fatalf("ResolveSettings() calls = %d, want 0 for invalid transport", agent.resolveCalls)
	}

	config.WorkDir = ""
	if _, err := NewRuntime(config, agent, transport); err == nil {
		t.Fatal("NewRuntime() unexpectedly accepted an empty work directory")
	}
	config.WorkDir = t.TempDir()
	config.RepositoryDir = ""
	if _, err := NewRuntime(config, agent, transport); err == nil {
		t.Fatal("NewRuntime() unexpectedly accepted an empty repository directory")
	}
	if agent.resolveCalls != 0 {
		t.Fatalf("ResolveSettings() calls = %d, want 0 for invalid directories", agent.resolveCalls)
	}
}

func TestNewRuntimeValidatesResolvedCapabilities(t *testing.T) {
	config := runtimeTestConfig(t.TempDir(), make(chan error, 1))
	agent := &runtimeTestAgent{
		settings: Settings{Mode: console.AgentRunModeAnalyze},
		modes:    []console.AgentRunMode{console.AgentRunModeWrite},
	}
	if _, err := NewRuntime(config, agent, &runtimeTestTransport{}); err == nil {
		t.Fatal("NewRuntime() unexpectedly accepted an unsupported mode")
	}
	if agent.resolveCalls != 1 {
		t.Fatalf("ResolveSettings() calls = %d, want 1", agent.resolveCalls)
	}
}

func TestRuntimeUploadArtifactsCleansExportStaging(t *testing.T) {
	workDir := t.TempDir()
	if err := stdexec.Command("git", "init", workDir).Run(); err != nil {
		t.Fatalf("git init: %v", err)
	}
	errors := make(chan error, 1)
	agent := &runtimeTestAgent{settings: Settings{Mode: console.AgentRunModeWrite}}
	transport := &runtimeTestTransport{
		completed: make(chan struct{}, 1),
		results:   []TurnResult{{SessionID: "session-1"}},
	}
	runtime, err := NewRuntime(runtimeTestConfig(workDir, errors), agent, transport)
	if err != nil {
		t.Fatalf("NewRuntime() error = %v", err)
	}
	runtime.Run(context.Background())
	<-transport.completed

	result, err := runtime.UploadArtifacts(context.Background())
	if err != nil {
		t.Fatalf("UploadArtifacts() error = %v", err)
	}
	if result == nil || result.SessionPath == "" {
		t.Fatalf("UploadArtifacts() = %#v, want session artifact", result)
	}
	if _, err := os.Stat(result.SessionPath); err != nil {
		t.Fatalf("session artifact stat: %v", err)
	}
	agent.mu.Lock()
	exportDir := agent.export.OutputDir
	agent.mu.Unlock()
	if _, err := os.Stat(exportDir); !os.IsNotExist(err) {
		t.Fatalf("export staging directory still exists: %q, stat error %v", exportDir, err)
	}
}
