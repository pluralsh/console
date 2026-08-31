package acp

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"time"

	acpsdk "github.com/coder/acp-go-sdk"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

func (tool *Tool) runPrompt(ctx context.Context, prompt string) error {
	return tool.runPromptWithOptions(ctx, prompt, nil)
}

func (tool *Tool) runPromptWithOptions(ctx context.Context, prompt string, options []exec.Option) error {
	if ctx == nil {
		ctx = context.Background()
	}
	if err := tool.validate(); err != nil {
		return err
	}

	return tool.runAttempt(ctx, prompt, options)
}

func (tool *Tool) runAttempt(ctx context.Context, prompt string, options []exec.Option) error {
	if ctx == nil {
		ctx = context.Background()
	}
	cwd, err := filepath.Abs(tool.Config.RepositoryDir)
	if err != nil {
		return fmt.Errorf("resolve ACP repository directory: %w", err)
	}
	attempt, err := tool.startAttempt(ctx, options)
	if err != nil {
		return err
	}
	defer attempt.close()
	return attempt.run(cwd, prompt)
}

type sessionAttempt struct {
	tool           *Tool
	ctx            context.Context
	process        *exec.StdioProcess
	connection     *acpsdk.ClientSideConnection
	turn           *turnState
	priorSessionID string
}

type sessionDetails struct {
	sessionID     string
	modes         *acpsdk.SessionModeState
	configOptions []acpsdk.SessionConfigOption
}

func (tool *Tool) startAttempt(ctx context.Context, options []exec.Option) (*sessionAttempt, error) {
	tool.mu.RLock()
	launch := tool.launch
	priorSessionID := tool.sessionID
	tool.mu.RUnlock()
	if launch == nil {
		return nil, errors.New("acp launcher is not set")
	}

	process, err := launch(ctx, options)
	if err != nil {
		return nil, err
	}
	if process == nil || process.Stdin == nil || process.Stdout == nil {
		return nil, rejectProcess(process)
	}
	return newSessionAttempt(tool, ctx, process, priorSessionID), nil
}

func rejectProcess(process *exec.StdioProcess) error {
	if process != nil {
		_ = process.Stop()
		_ = process.Wait()
	}
	return errors.New("acp launcher returned an incomplete stdio process")
}

func newSessionAttempt(tool *Tool, ctx context.Context, process *exec.StdioProcess, priorSessionID string) *sessionAttempt {
	turn := newTurn(tool, priorSessionID)
	attempt := &sessionAttempt{
		tool:           tool,
		ctx:            ctx,
		process:        process,
		connection:     acpsdk.NewClientSideConnection(&client{turn: turn}, process.Stdin, process.Stdout),
		turn:           turn,
		priorSessionID: priorSessionID,
	}
	attempt.connection.SetLogger(slog.New(slog.NewTextHandler(io.Discard, nil)))
	attempt.drainStderr()
	return attempt
}

func (attempt *sessionAttempt) drainStderr() {
	if attempt.process.Stderr == nil {
		return
	}
	go func() {
		if _, err := io.Copy(io.Discard, attempt.process.Stderr); err != nil && !errors.Is(err, io.ErrClosedPipe) {
			klog.V(log.LogLevelDebug).InfoS("ACP stderr drain ended", "error", err)
		}
	}()
}

func (attempt *sessionAttempt) close() {
	// The process is stopped explicitly during the run. This final guard
	// handles setup failures and keeps test launchers from leaking children.
	_ = attempt.process.Close()
}

func (attempt *sessionAttempt) run(cwd, prompt string) error {
	initialize, err := attempt.initialize()
	if err != nil {
		return attempt.fail(fmt.Errorf("acp initialize: %w", err), attempt.cancelled())
	}
	if initialize.ProtocolVersion != acpsdk.ProtocolVersionNumber {
		return attempt.fail(fmt.Errorf("acp protocol version %d is unsupported", initialize.ProtocolVersion), false)
	}

	details, err := attempt.openSession(cwd)
	if err != nil {
		return attempt.fail(err, attempt.cancelled())
	}
	if err := attempt.configureSession(details); err != nil {
		return attempt.fail(err, attempt.cancelled())
	}
	if err := attempt.stopIfCancelled(); err != nil {
		return err
	}

	response, err := attempt.prompt(prompt, details.sessionID)
	if err != nil {
		return attempt.promptFailure(err)
	}
	attempt.finishTurn(response.Usage)
	if err := attempt.turn.err(); err != nil {
		return attempt.fail(err, attempt.cancelled())
	}
	if err := attempt.stopIfCancelled(); err != nil {
		return err
	}
	if err := attempt.stop(false); err != nil {
		return fmt.Errorf("stop acp process: %w", err)
	}
	return promptResult(response.StopReason)
}

func (attempt *sessionAttempt) configureSession(details sessionDetails) error {
	err := attempt.tool.setSessionConfig(attempt.ctx, attempt.connection, details.sessionID, details.modes, details.configOptions)
	if err != nil && attempt.priorSessionID == "" {
		attempt.tool.setSessionID("")
	}
	return err
}

func (attempt *sessionAttempt) initialize() (acpsdk.InitializeResponse, error) {
	return attempt.connection.Initialize(attempt.ctx, acpsdk.InitializeRequest{
		ProtocolVersion: acpsdk.ProtocolVersionNumber,
		ClientInfo: &acpsdk.Implementation{
			Name:    "plural-agent-harness",
			Version: "1",
		},
		ClientCapabilities: acpsdk.ClientCapabilities{
			Fs: acpsdk.FileSystemCapabilities{
				ReadTextFile:  true,
				WriteTextFile: true,
			},
			Terminal: false,
			Auth:     acpsdk.AuthCapabilities{},
		},
	})
}

func (attempt *sessionAttempt) openSession(cwd string) (sessionDetails, error) {
	existingSession := attempt.tool.sessionIDValue()
	if existingSession == "" {
		return attempt.createSession(cwd)
	}
	return attempt.resumeSession(cwd, existingSession)
}

func (attempt *sessionAttempt) createSession(cwd string) (sessionDetails, error) {
	created, err := attempt.connection.NewSession(attempt.ctx, acpsdk.NewSessionRequest{
		Cwd:        cwd,
		McpServers: []acpsdk.McpServer{},
	})
	if err != nil {
		return sessionDetails{}, fmt.Errorf("acp session/new: %w", err)
	}
	if created.SessionId == "" {
		return sessionDetails{}, errors.New("acp session/new returned an empty session id")
	}
	sessionID := string(created.SessionId)
	attempt.tool.setSessionID(sessionID)
	attempt.turn.setSessionID(sessionID)
	return sessionDetails{
		sessionID:     sessionID,
		modes:         created.Modes,
		configOptions: created.ConfigOptions,
	}, nil
}

func (attempt *sessionAttempt) resumeSession(cwd, sessionID string) (sessionDetails, error) {
	resumed, err := attempt.connection.ResumeSession(attempt.ctx, acpsdk.ResumeSessionRequest{
		Cwd:        cwd,
		McpServers: []acpsdk.McpServer{},
		SessionId:  acpsdk.SessionId(sessionID),
	})
	if err != nil {
		return sessionDetails{}, fmt.Errorf("acp session/resume: %w", err)
	}
	attempt.turn.setSessionID(sessionID)
	return sessionDetails{
		sessionID:     sessionID,
		modes:         resumed.Modes,
		configOptions: resumed.ConfigOptions,
	}, nil
}

func (attempt *sessionAttempt) prompt(prompt, sessionID string) (acpsdk.PromptResponse, error) {
	return attempt.connection.Prompt(attempt.ctx, acpsdk.PromptRequest{
		SessionId: acpsdk.SessionId(sessionID),
		Prompt:    []acpsdk.ContentBlock{acpsdk.TextBlock(prompt)},
	})
}

func (attempt *sessionAttempt) finishTurn(usage *acpsdk.Usage) {
	attempt.turn.emitAssistant(usage)
}

func (attempt *sessionAttempt) promptFailure(err error) error {
	cancelled := attempt.cancelled()
	_ = attempt.stop(cancelled)
	if cancelled {
		return context.Cause(attempt.ctx)
	}
	// Prompt has crossed the dispatch boundary. Its result is never replayed
	// because the agent may have received it.
	return fmt.Errorf("acp session/prompt: %w", err)
}

func (attempt *sessionAttempt) fail(err error, cancel bool) error {
	_ = attempt.stop(cancel)
	return err
}

func (attempt *sessionAttempt) cancelled() bool {
	return attempt.ctx.Err() != nil
}

func (attempt *sessionAttempt) stopIfCancelled() error {
	if !attempt.cancelled() {
		return nil
	}
	_ = attempt.stop(true)
	return context.Cause(attempt.ctx)
}

func (attempt *sessionAttempt) stop(cancel bool) error {
	if cancel {
		attempt.cancelSession()
		// Closing stdin lets a cooperative ACP process finish after it has
		// acknowledged cancellation. If it does not, kill it below.
		_ = attempt.process.Stdin.Close()
		return attempt.waitForExit()
	}
	// ACP agents terminate cleanly when stdin reaches EOF. Give that path a
	// bounded opportunity before using a hard kill.
	if err := attempt.process.Stdin.Close(); err != nil && !errors.Is(err, os.ErrClosed) {
		klog.V(log.LogLevelDebug).InfoS("ACP stdin close failed", "error", err)
	}
	return attempt.waitForExit()
}

func (attempt *sessionAttempt) cancelSession() {
	sessionID := attempt.turn.sessionID()
	if sessionID == "" {
		return
	}
	cancelCtx, cancel := context.WithTimeout(context.Background(), attempt.tool.stopTimeout)
	err := attempt.connection.Cancel(cancelCtx, acpsdk.CancelNotification{SessionId: acpsdk.SessionId(sessionID)})
	cancel()
	if err != nil {
		klog.V(log.LogLevelDebug).InfoS("ACP session cancellation failed", "error", err)
	}
}

func (attempt *sessionAttempt) waitForExit() error {
	waitCh := make(chan error, 1)
	go func() { waitCh <- attempt.process.Wait() }()
	timer := time.NewTimer(attempt.tool.stopTimeout)
	defer timer.Stop()
	select {
	case waitErr := <-waitCh:
		return waitErr
	case <-timer.C:
		return attempt.killAndWait(waitCh)
	}
}

func (attempt *sessionAttempt) killAndWait(waitCh <-chan error) error {
	if err := attempt.process.Kill(); err != nil && !errors.Is(err, os.ErrProcessDone) {
		klog.V(log.LogLevelDebug).InfoS("ACP process kill failed", "error", err)
	}
	return <-waitCh
}

func (tool *Tool) sessionIDValue() string {
	tool.mu.RLock()
	defer tool.mu.RUnlock()
	return tool.sessionID
}

func promptResult(reason acpsdk.StopReason) error {
	switch reason {
	case acpsdk.StopReasonEndTurn:
		return nil
	case acpsdk.StopReasonMaxTokens,
		acpsdk.StopReasonMaxTurnRequests,
		acpsdk.StopReasonRefusal,
		acpsdk.StopReasonCancelled:
		return fmt.Errorf("acp prompt stopped with reason %q", reason)
	default:
		return fmt.Errorf("acp prompt returned unexpected stop reason %q", reason)
	}
}

func (tool *Tool) setSessionConfig(ctx context.Context, connection *acpsdk.ClientSideConnection, sessionID string, modes *acpsdk.SessionModeState, options []acpsdk.SessionConfigOption) error {
	tool.mu.RLock()
	mode := tool.mode
	model := tool.model
	tool.mu.RUnlock()

	if err := setModelConfig(ctx, connection, sessionID, options, model); err != nil {
		return err
	}
	return setModeConfig(ctx, connection, sessionID, modes, options, mode)
}

func setModelConfig(ctx context.Context, connection *acpsdk.ClientSideConnection, sessionID string, options []acpsdk.SessionConfigOption, model string) error {
	if model == "" {
		return nil
	}
	found, err := setConfigOption(ctx, connection, sessionID, options, "model", model)
	if err != nil {
		return err
	}
	if !found {
		klog.V(log.LogLevelDebug).InfoS("ACP agent did not advertise a model config option")
	}
	return nil
}

func setModeConfig(ctx context.Context, connection *acpsdk.ClientSideConnection, sessionID string, modes *acpsdk.SessionModeState, options []acpsdk.SessionConfigOption, mode string) error {
	if mode == "" {
		return nil
	}
	if modeAvailable(modes, mode) {
		if _, err := connection.SetSessionMode(ctx, acpsdk.SetSessionModeRequest{
			SessionId: acpsdk.SessionId(sessionID),
			ModeId:    acpsdk.SessionModeId(mode),
		}); err != nil {
			return fmt.Errorf("acp session/set_mode: %w", err)
		}
		return nil
	}
	if found, err := setConfigOption(ctx, connection, sessionID, options, "mode", mode); err != nil {
		return err
	} else if found {
		return nil
	}
	klog.V(log.LogLevelDebug).InfoS("ACP agent did not advertise a mode config option", "mode", mode)
	return nil
}

func modeAvailable(modes *acpsdk.SessionModeState, mode string) bool {
	if modes == nil {
		return false
	}
	for _, available := range modes.AvailableModes {
		if string(available.Id) == mode {
			return true
		}
	}
	return false
}

func setConfigOption(ctx context.Context, connection *acpsdk.ClientSideConnection, sessionID string, options []acpsdk.SessionConfigOption, configID, value string) (bool, error) {
	for _, option := range options {
		if option.Select == nil || string(option.Select.Id) != configID {
			continue
		}
		wanted := acpsdk.SessionConfigValueId(value)
		if option.Select.CurrentValue == wanted {
			return true, nil
		}
		if !configOptionContains(option.Select.Options, wanted) {
			return true, fmt.Errorf("acp %s %q is not advertised", configID, value)
		}
		if _, err := connection.SetSessionConfigOption(ctx, acpsdk.SetSessionConfigOptionRequest{
			ValueId: &acpsdk.SetSessionConfigOptionValueId{
				ConfigId:  option.Select.Id,
				SessionId: acpsdk.SessionId(sessionID),
				Value:     wanted,
			},
		}); err != nil {
			return true, fmt.Errorf("acp session/set_config_option %s: %w", configID, err)
		}
		return true, nil
	}
	return false, nil
}

func configOptionContains(options acpsdk.SessionConfigSelectOptions, wanted acpsdk.SessionConfigValueId) bool {
	if options.Ungrouped != nil {
		for _, option := range *options.Ungrouped {
			if option.Value == wanted {
				return true
			}
		}
	}
	if options.Grouped != nil {
		for _, group := range *options.Grouped {
			for _, option := range group.Options {
				if option.Value == wanted {
					return true
				}
			}
		}
	}
	return false
}

func (tool *Tool) validate() error {
	if tool.Config.Run == nil {
		return errors.New("agent run is not set")
	}
	if tool.Config.RepositoryDir == "" {
		return errors.New("repository directory is not set")
	}
	if tool.Config.WorkDir == "" {
		return errors.New("work directory is not set")
	}
	if tool.Config.ErrorChan == nil {
		return errors.New("error channel is not set")
	}
	return nil
}
