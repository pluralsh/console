package acp

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"os"
	"time"

	acpsdk "github.com/coder/acp-go-sdk"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

type sessionAttempt struct {
	engine          *Engine
	ctx             context.Context
	process         *exec.StdioProcess
	connection      *acpsdk.ClientSideConnection
	turn            *turnState
	settings        SessionSettings
	cwd             string
	root            *os.Root
	fileSystemWrite bool
	priorSessionID  string
	sessionID       string
}

type sessionDetails struct {
	sessionID     string
	modes         *acpsdk.SessionModeState
	configOptions []acpsdk.SessionConfigOption
}

func (attempt *sessionAttempt) run(prompt string) error {
	initialize, err := attempt.initialize()
	if err != nil {
		return attempt.fail(fmt.Errorf("acp initialize: %w", err), attempt.cancelled())
	}
	if initialize.ProtocolVersion != acpsdk.ProtocolVersionNumber {
		return attempt.fail(fmt.Errorf("acp protocol version %d is unsupported", initialize.ProtocolVersion), false)
	}
	if err = attempt.authenticate(initialize.AuthMethods); err != nil {
		return attempt.fail(err, attempt.cancelled())
	}

	details, err := attempt.openSession(attempt.cwd)
	if err != nil {
		return attempt.fail(err, attempt.cancelled())
	}
	if err = attempt.configureSession(details); err != nil {
		return attempt.fail(err, attempt.cancelled())
	}
	if err = attempt.stopIfCancelled(); err != nil {
		return err
	}

	response, err := attempt.prompt(prompt, details.sessionID)
	if err != nil {
		return attempt.promptFailure(err)
	}

	attempt.finishTurn(response)
	if err = attempt.turn.err(); err != nil {
		return attempt.fail(err, attempt.cancelled())
	}
	if err = attempt.stopIfCancelled(); err != nil {
		return err
	}

	resultErr := attempt.promptResult(response.StopReason)
	stopErr := attempt.stop(false)
	if resultErr != nil {
		return attempt.processFailure(resultErr, stopErr)
	}
	if stopErr != nil {
		klog.V(log.LogLevelDebug).InfoS("ACP process cleanup failed after completed prompt", "error", stopErr)
	}

	return nil
}

func (attempt *sessionAttempt) authenticate(methods []acpsdk.AuthMethod) error {
	methodID := attempt.engine.authenticationMethod
	if methodID == "" {
		return nil
	}

	if !attempt.authenticationMethodAvailable(methods, methodID) {
		return fmt.Errorf("acp authentication method %q is not advertised", methodID)
	}

	if _, err := attempt.connection.Authenticate(
		attempt.ctx,
		acpsdk.AuthenticateRequest{MethodId: methodID},
	); err != nil {
		return fmt.Errorf("acp authenticate: %w", err)
	}

	return nil
}

func (attempt *sessionAttempt) authenticationMethodAvailable(methods []acpsdk.AuthMethod, methodID string) bool {
	for _, method := range methods {
		switch {
		case method.Agent != nil && method.Agent.Id == methodID:
			return true
		case method.EnvVar != nil && method.EnvVar.Id == methodID:
			return true
		case method.Terminal != nil && method.Terminal.Id == methodID:
			return true
		}
	}

	return false
}

func (attempt *sessionAttempt) configureSession(details sessionDetails) error {
	err := attempt.engine.setSessionConfig(attempt.ctx, attempt.connection, details.sessionID, details.modes, details.configOptions, attempt.settings)
	if err != nil && attempt.priorSessionID == "" {
		attempt.turn.setSessionID("")
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
				WriteTextFile: attempt.fileSystemWrite,
			},
			Auth: acpsdk.AuthCapabilities{},
		},
	})
}

func (attempt *sessionAttempt) openSession(cwd string) (sessionDetails, error) {
	existingSession := attempt.priorSessionID
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
	if provisionalID := attempt.turn.sessionID(); provisionalID != "" && provisionalID != sessionID {
		return sessionDetails{}, attempt.turn.sessionUpdateMismatch(acpsdk.SessionId(provisionalID), sessionID)
	}
	attempt.turn.setSessionID(sessionID)
	attempt.sessionID = sessionID
	attempt.turn.sink.Session(sessionID)
	return sessionDetails{
		sessionID:     sessionID,
		modes:         created.Modes,
		configOptions: created.ConfigOptions,
	}, nil
}

func (attempt *sessionAttempt) resumeSession(cwd, sessionID string) (sessionDetails, error) {
	attempt.turn.setRestoring(true)
	defer attempt.turn.setRestoring(false)
	resumed, err := attempt.engine.restoreSession(attempt.ctx, attempt.connection, SessionRestoreRequest{Cwd: cwd, SessionID: sessionID})
	if err != nil {
		return sessionDetails{}, fmt.Errorf("acp session restore: %w", err)
	}
	attempt.turn.setSessionID(sessionID)
	attempt.sessionID = sessionID
	attempt.turn.sink.Session(sessionID)
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

func (attempt *sessionAttempt) finishTurn(response acpsdk.PromptResponse) {
	attempt.turn.emitAssistant(attempt.engine.usageResolver(response))
}

func (attempt *sessionAttempt) close() {
	_ = attempt.root.Close()
	// The process is stopped explicitly during the run. This final guard
	// handles setup failures and keeps test launchers from leaking children.
	_ = attempt.process.Close()
}

func (attempt *sessionAttempt) promptFailure(err error) error {
	cancelled := attempt.cancelled()
	stopErr := attempt.stop(cancelled)
	if cancelled {
		return context.Cause(attempt.ctx)
	}
	// Prompt has crossed the dispatch boundary. Its result is never replayed
	// because the agent may have received it.
	return attempt.processFailure(fmt.Errorf("acp session/prompt: %w", err), stopErr)
}

func (attempt *sessionAttempt) fail(err error, cancel bool) error {
	stopErr := attempt.stop(cancel)
	if cancel {
		return err
	}
	return attempt.processFailure(err, stopErr)
}

func (attempt *sessionAttempt) processFailure(err, stopErr error) error {
	if stopErr != nil {
		err = fmt.Errorf("%w: acp process exited: %w", err, stopErr)
	}
	if stderr := attempt.process.StderrTail(); stderr != "" {
		return fmt.Errorf("%w: acp stderr: %s", err, stderr)
	}
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
	cancelCtx, cancel := context.WithTimeout(context.Background(), attempt.engine.stopTimeout)
	err := attempt.connection.Cancel(cancelCtx, acpsdk.CancelNotification{SessionId: acpsdk.SessionId(sessionID)})
	cancel()
	if err != nil {
		klog.V(log.LogLevelDebug).InfoS("ACP session cancellation failed", "error", err)
	}
}

func (attempt *sessionAttempt) waitForExit() error {
	waitCh := make(chan error, 1)
	go func() { waitCh <- attempt.process.Wait() }()
	timer := time.NewTimer(attempt.engine.stopTimeout)
	defer timer.Stop()
	select {
	case waitErr := <-waitCh:
		return waitErr
	case <-timer.C:
		return attempt.stopAndWait(waitCh)
	}
}

func (attempt *sessionAttempt) stopAndWait(waitCh <-chan error) error {
	if err := attempt.process.Stop(); err != nil && !errors.Is(err, os.ErrProcessDone) {
		klog.V(log.LogLevelDebug).InfoS("ACP process stop failed", "error", err)
	}
	return <-waitCh
}

func (attempt *sessionAttempt) promptResult(reason acpsdk.StopReason) error {
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

func newSessionAttempt(engine *Engine, ctx context.Context, process *exec.StdioProcess, request Request, sink Sink) (*sessionAttempt, error) {
	root, err := os.OpenRoot(request.Cwd)
	if err != nil {
		return nil, fmt.Errorf("open acp working directory: %w", err)
	}
	turn := newTurn(engine, sink, request.SessionID)
	attempt := &sessionAttempt{
		engine:  engine,
		ctx:     ctx,
		process: process,
		connection: acpsdk.NewClientSideConnection(&client{
			turn:            turn,
			cwd:             request.Cwd,
			root:            root,
			fileSystemWrite: request.FileSystemWrite,
		}, process.Stdin, process.Stdout),
		turn:            turn,
		settings:        request.Settings,
		cwd:             request.Cwd,
		root:            root,
		fileSystemWrite: request.FileSystemWrite,
		priorSessionID:  request.SessionID,
		sessionID:       request.SessionID,
	}
	attempt.connection.SetLogger(slog.New(slog.NewTextHandler(io.Discard, nil)))
	return attempt, nil
}
