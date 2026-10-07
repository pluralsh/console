package v1

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"sync"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/artifacts"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/usage"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
)

// Runtime composes an Agent with a transport and presents the existing Tool
// contract to the controller. The transport is shared by all turn kinds, but
// only one turn is allowed to execute at a time.
type Runtime struct {
	DefaultTool

	agent     Agent
	transport Transport

	mu        sync.RWMutex
	turnMu    sync.Mutex
	sessionID string
	settings  Settings
	onMessage MessageCallback
}

var _ Tool = (*Runtime)(nil)

// NewRuntime resolves settings once and creates a compositional runtime for an
// existing v1.Config. The resolved settings are immutable for the lifetime of
// the run and contain no credentials.
func NewRuntime(config Config, agent Agent, transport Transport) (*Runtime, error) {
	if agent == nil {
		return nil, errors.New("agent is not set")
	}
	if config.Run == nil {
		return nil, errors.New("agent run is not set")
	}
	if transport == nil {
		return nil, errors.New("transport is not set")
	}
	if config.WorkDir == "" {
		return nil, errors.New("work directory is not set")
	}
	if config.RepositoryDir == "" {
		return nil, errors.New("repository directory is not set")
	}

	runtime := &Runtime{
		DefaultTool: DefaultTool{Config: config},
		agent:       agent,
		transport:   transport,
	}
	if runtime.Config.Usage == nil {
		runtime.Config.Usage = usage.New(nil)
	}

	settings, err := agent.ResolveSettings(config.Run)
	if err != nil {
		return nil, err
	}
	if settings.Mode == "" {
		settings.Mode = config.Run.Mode
	}

	if !agent.Capabilities().Supports(settings.Mode) {
		return nil, fmt.Errorf("agent %s does not support run mode %q", agent.Type(), settings.Mode)
	}

	runtime.settings = settings
	return runtime, nil
}

// Run starts the initial prompt asynchronously, matching the existing Tool
// contract. Initial failures are sent to ErrorChan.
func (runtime *Runtime) Run(ctx context.Context, options ...exec.Option) {
	initialOptions := append([]exec.Option(nil), options...)

	go func() {
		if runtime.Config.SkipInitialRun {
			return
		}
		if runtime.Config.Run == nil {
			runtime.reportError(errors.New("agent run is not set"))
			return
		}

		prompt := runtime.Config.Run.Prompt
		runtime.emitMessage(&console.AgentMessageAttributes{Message: prompt, Role: console.AiRoleUser}, "")
		if err := runtime.turn(ctx, TurnRequest{
			Kind:    TurnKindInitial,
			Prompt:  prompt,
			Options: initialOptions,
		}); err != nil {
			runtime.reportError(err)
		}
	}()
}

// BabysitRun runs a changed-PR prompt synchronously. A nil context is a no-op,
// as required by the controller's babysit loop. Failures use ErrorChan just as
// initial asynchronous failures do.
func (runtime *Runtime) BabysitRun(ctx context.Context, babysit *BabysitContext) bool {
	if babysit == nil {
		return false
	}

	runtime.emitMessage(&console.AgentMessageAttributes{Message: babysit.Prompt, Role: console.AiRoleUser}, "")
	if err := runtime.turn(ctx, TurnRequest{Kind: TurnKindBabysit, Prompt: babysit.Prompt}); err != nil {
		runtime.reportError(err)
	}

	return false
}

// Configure performs the initial provider configuration. Credentials are
// passed to the Agent for this call only and are not retained by Runtime.
func (runtime *Runtime) Configure(consoleURL, consoleToken string) error {
	return runtime.configure(context.Background(), ConfigureRequest{
		Phase:        ConfigurePhaseInitial,
		ConsoleURL:   consoleURL,
		ConsoleToken: consoleToken,
	})
}

// ConfigureBabysitRun performs the provider's babysit configuration pass.
// Existing provider configuration is reused; no Console credentials are
// copied into this request.
func (runtime *Runtime) ConfigureBabysitRun() error {
	return runtime.configure(context.Background(), ConfigureRequest{Phase: ConfigurePhaseBabysit})
}

// OnMessage registers a callback for provider-neutral messages. A nil callback
// unregisters the current callback.
func (runtime *Runtime) OnMessage(callback MessageCallback) {
	runtime.mu.Lock()
	runtime.onMessage = callback
	runtime.mu.Unlock()
}

// FollowUpRun runs a follow-up prompt synchronously and returns its error to
// the caller. It deliberately does not emit the user prompt.
func (runtime *Runtime) FollowUpRun(ctx context.Context, prompt string) error {
	return runtime.turn(ctx, TurnRequest{Kind: TurnKindFollowup, Prompt: prompt})
}

// UploadArtifacts exports provider-native state into a temporary staging
// directory, builds the normal upload artifacts, then removes the staging
// directory. Export and build failures are returned to the caller and are not
// sent to ErrorChan; artifact handling is a best-effort controller concern.
func (runtime *Runtime) UploadArtifacts(ctx context.Context) (*artifacts.UploadArtifacts, error) {
	runtime.mu.RLock()
	sessionID := runtime.sessionID
	runtime.mu.RUnlock()
	if sessionID == "" {
		return nil, errors.New("agent session id is not set")
	}

	stagingRoot := runtime.Config.WorkDir
	if stagingRoot != "" {
		if err := os.MkdirAll(stagingRoot, 0755); err != nil {
			return nil, fmt.Errorf("create artifact staging parent: %w", err)
		}
	}

	stagingDir, err := os.MkdirTemp(stagingRoot, "agent-session-export-*")
	if err != nil {
		return nil, fmt.Errorf("create agent session staging directory: %w", err)
	}
	defer os.RemoveAll(stagingDir)

	export, err := runtime.agent.Export(ctx, ExportRequest{
		SessionID: sessionID,
		OutputDir: stagingDir,
	})
	if err != nil {
		return nil, err
	}

	return runtime.BuildUploadArtifacts(ctx, artifacts.BuildArtifactsOptions{
		Provider:  strings.ToLower(runtime.agent.Type().String()),
		Source:    export.SessionSource,
		SessionID: sessionID,
	})
}

func (runtime *Runtime) configure(ctx context.Context, request ConfigureRequest) error {
	filesystem := FileSystemRequest{
		Phase:         request.Phase,
		WorkDir:       runtime.Config.WorkDir,
		RepositoryDir: runtime.Config.RepositoryDir,
	}

	if err := runtime.agent.Prepare(ctx, filesystem); err != nil {
		return err
	}
	request.Settings = runtime.settings

	return runtime.agent.Configure(ctx, request)
}

func (runtime *Runtime) turn(ctx context.Context, request TurnRequest) error {
	if request.Kind == "" {
		return errors.New("turn kind is not set")
	}
	if request.Kind == TurnKindInitial && runtime.Config.Run == nil {
		return errors.New("agent run is not set")
	}

	runtime.turnMu.Lock()
	defer runtime.turnMu.Unlock()

	runtime.mu.RLock()
	request.SessionID = runtime.sessionID
	request.Settings = runtime.settings
	runtime.mu.RUnlock()
	request.Options = append([]exec.Option(nil), request.Options...)

	result, err := runtime.transport.Turn(ctx, request, runtime.sink())
	// Update state before returning the error. Some transports can discover a
	// usable session ID while also reporting a failed turn.
	if result.SessionID != "" {
		runtime.mu.Lock()
		runtime.sessionID = result.SessionID
		runtime.mu.Unlock()
	}

	return err
}

func (runtime *Runtime) sink() TurnSink {
	return runtimeTurnSink{runtime: runtime}
}

func (runtime *Runtime) emitMessage(message *console.AgentMessageAttributes, callID string) {
	if message == nil {
		return
	}

	runtime.mu.RLock()
	callback := runtime.onMessage
	runtime.mu.RUnlock()

	if callback == nil {
		return
	}
	defer func() {
		_ = recover()
	}()

	callback(message, callID)
}

func (runtime *Runtime) reportError(err error) {
	if err == nil || runtime.Config.ErrorChan == nil {
		return
	}

	defer func() {
		_ = recover()
	}()

	runtime.Config.ErrorChan <- err
}

// runtimeTurnSink adapts the optional Tool callbacks and run-level usage
// accumulator to the non-optional Transport sink interface.
type runtimeTurnSink struct {
	runtime *Runtime
}

func (sink runtimeTurnSink) Session(sessionID string) {
	if sessionID == "" {
		return
	}

	sink.runtime.mu.Lock()
	sink.runtime.sessionID = sessionID
	sink.runtime.mu.Unlock()
}

func (sink runtimeTurnSink) Message(message *console.AgentMessageAttributes, callID string) {
	sink.runtime.emitMessage(message, callID)
}

func (sink runtimeTurnSink) ToolCallOutput(callID, stdout string) {
	sink.runtime.EmitOutput(callID, stdout)
}

func (sink runtimeTurnSink) Usage(record usage.Record) {
	if sink.runtime.Config.Usage == nil {
		sink.runtime.Config.Usage = usage.New(nil)
	}

	sink.runtime.Config.Usage.RecordUsage(record)
}

// Keep this assertion close to the adapter so changes to the callback
// contract fail at compile time.
var _ TurnSink = runtimeTurnSink{}
