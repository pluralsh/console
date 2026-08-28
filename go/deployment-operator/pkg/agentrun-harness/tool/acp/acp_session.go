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
	tool.mu.RLock()
	launch := tool.launch
	priorSessionID := tool.sessionID
	tool.mu.RUnlock()
	if launch == nil {
		return errors.New("ACP launcher is not set")
	}

	process, err := launch(ctx, options)
	if err != nil {
		return err
	}
	if process == nil || process.Stdin == nil || process.Stdout == nil {
		if process != nil {
			_ = process.Stop()
			_ = process.Wait()
		}
		return errors.New("ACP launcher returned an incomplete stdio process")
	}
	defer func() {
		// The process is stopped explicitly below. This is a final guard for
		// setup failures and keeps test launchers from leaking children.
		_ = process.Close()
	}()

	if process.Stderr != nil {
		go func() {
			if _, copyErr := io.Copy(io.Discard, process.Stderr); copyErr != nil && !errors.Is(copyErr, io.ErrClosedPipe) {
				klog.V(log.LogLevelDebug).InfoS("ACP stderr drain ended", "error", copyErr)
			}
		}()
	}

	turn := newTurn(tool, priorSessionID)
	defer turn.stopFlusher()
	client := &client{turn: turn}
	connection := acpsdk.NewClientSideConnection(client, process.Stdin, process.Stdout)
	connection.SetLogger(slog.New(slog.NewTextHandler(io.Discard, nil)))
	turn.startFlusher(ctx)

	waitForExit := func() error {
		waitCh := make(chan error, 1)
		go func() { waitCh <- process.Wait() }()
		timer := time.NewTimer(tool.stopTimeout)
		defer timer.Stop()
		select {
		case waitErr := <-waitCh:
			return waitErr
		case <-timer.C:
			if killErr := process.Kill(); killErr != nil && !errors.Is(killErr, os.ErrProcessDone) {
				klog.V(log.LogLevelDebug).InfoS("ACP process kill failed", "error", killErr)
			}
			return <-waitCh
		}
	}

	stop := func(cancel bool) error {
		if cancel {
			cancelCtx, cancelFunc := context.WithTimeout(context.Background(), tool.stopTimeout)
			sessionID := turn.sessionID()
			var cancelErr error
			if sessionID != "" {
				cancelErr = connection.Cancel(cancelCtx, acpsdk.CancelNotification{SessionId: acpsdk.SessionId(sessionID)})
			}
			cancelFunc()
			if cancelErr != nil {
				klog.V(log.LogLevelDebug).InfoS("ACP session cancellation failed", "error", cancelErr)
			}
			waitCh := make(chan error, 1)
			go func() { waitCh <- process.Wait() }()
			// Closing stdin lets a cooperative ACP process finish after it has
			// acknowledged cancellation. If it does not, kill it below.
			_ = process.Stdin.Close()
			timer := time.NewTimer(tool.stopTimeout)
			defer timer.Stop()
			select {
			case waitErr := <-waitCh:
				return waitErr
			case <-timer.C:
				if killErr := process.Kill(); killErr != nil && !errors.Is(killErr, os.ErrProcessDone) {
					klog.V(log.LogLevelDebug).InfoS("ACP process kill failed", "error", killErr)
				}
				return <-waitCh
			}
		}
		// ACP agents terminate cleanly when stdin reaches EOF. Give that
		// path a bounded opportunity before using a hard kill.
		if err := process.Stdin.Close(); err != nil && !errors.Is(err, os.ErrClosed) {
			klog.V(log.LogLevelDebug).InfoS("ACP stdin close failed", "error", err)
		}
		return waitForExit()
	}

	initialize, err := connection.Initialize(ctx, acpsdk.InitializeRequest{
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
	if err != nil {
		_ = stop(ctx.Err() != nil)
		return fmt.Errorf("ACP initialize: %w", err)
	}
	if initialize.ProtocolVersion != acpsdk.ProtocolVersionNumber {
		_ = stop(false)
		return fmt.Errorf("ACP protocol version %d is unsupported", initialize.ProtocolVersion)
	}

	tool.mu.RLock()
	existingSession := tool.sessionID
	tool.mu.RUnlock()
	var modes *acpsdk.SessionModeState
	var configOptions []acpsdk.SessionConfigOption
	if existingSession == "" {
		created, createErr := connection.NewSession(ctx, acpsdk.NewSessionRequest{
			Cwd:        cwd,
			McpServers: []acpsdk.McpServer{},
		})
		if createErr != nil {
			_ = stop(ctx.Err() != nil)
			return fmt.Errorf("ACP session/new: %w", createErr)
		}
		if created.SessionId == "" {
			_ = stop(ctx.Err() != nil)
			return errors.New("ACP session/new returned an empty session id")
		}
		tool.setSessionID(string(created.SessionId))
		turn.setSessionID(string(created.SessionId))
		modes = created.Modes
		configOptions = created.ConfigOptions
	} else {
		resumed, resumeErr := connection.ResumeSession(ctx, acpsdk.ResumeSessionRequest{
			Cwd:        cwd,
			McpServers: []acpsdk.McpServer{},
			SessionId:  acpsdk.SessionId(existingSession),
		})
		if resumeErr != nil {
			_ = stop(ctx.Err() != nil)
			return fmt.Errorf("ACP session/resume: %w", resumeErr)
		}
		modes = resumed.Modes
		configOptions = resumed.ConfigOptions
		turn.setSessionID(existingSession)
	}

	if err := tool.setSessionConfig(ctx, connection, turn.sessionID(), modes, configOptions); err != nil {
		_ = stop(ctx.Err() != nil)
		if priorSessionID == "" {
			tool.setSessionID("")
		}
		return err
	}

	if ctx.Err() != nil {
		_ = stop(true)
		return context.Cause(ctx)
	}
	response, promptErr := connection.Prompt(ctx, acpsdk.PromptRequest{
		SessionId: acpsdk.SessionId(turn.sessionID()),
		Prompt:    []acpsdk.ContentBlock{acpsdk.TextBlock(prompt)},
	})
	if promptErr != nil {
		cancelled := ctx.Err() != nil
		_ = stop(cancelled)
		if cancelled {
			return context.Cause(ctx)
		}
		// Prompt has crossed the dispatch boundary. Its result is never
		// replayed because the agent may have received it.
		return fmt.Errorf("ACP session/prompt: %w", promptErr)
	}

	turn.stopFlusher()
	turn.flushTools(true)
	turn.emitAssistant(response.Usage)
	if turn.err() != nil {
		_ = stop(ctx.Err() != nil)
		return turn.err()
	}
	if ctx.Err() != nil {
		_ = stop(true)
		return context.Cause(ctx)
	}
	if err := stop(false); err != nil {
		return fmt.Errorf("stop ACP process: %w", err)
	}
	switch response.StopReason {
	case acpsdk.StopReasonEndTurn:
		return nil
	case acpsdk.StopReasonMaxTokens,
		acpsdk.StopReasonMaxTurnRequests,
		acpsdk.StopReasonRefusal,
		acpsdk.StopReasonCancelled:
		return fmt.Errorf("ACP prompt stopped with reason %q", response.StopReason)
	default:
		return fmt.Errorf("ACP prompt returned unexpected stop reason %q", response.StopReason)
	}
}

func (tool *Tool) setSessionConfig(ctx context.Context, connection *acpsdk.ClientSideConnection, sessionID string, modes *acpsdk.SessionModeState, options []acpsdk.SessionConfigOption) error {
	tool.mu.RLock()
	mode := tool.mode
	model := tool.model
	tool.mu.RUnlock()

	if model != "" {
		if found, err := setConfigOption(ctx, connection, sessionID, options, "model", model); err != nil {
			return err
		} else if !found {
			klog.V(log.LogLevelDebug).InfoS("ACP agent did not advertise a model config option")
		}
	}

	if mode == "" {
		return nil
	}
	if modes != nil {
		for _, available := range modes.AvailableModes {
			if string(available.Id) == mode {
				if _, err := connection.SetSessionMode(ctx, acpsdk.SetSessionModeRequest{
					SessionId: acpsdk.SessionId(sessionID),
					ModeId:    acpsdk.SessionModeId(mode),
				}); err != nil {
					return fmt.Errorf("ACP session/set_mode: %w", err)
				}
				return nil
			}
		}
	}
	if found, err := setConfigOption(ctx, connection, sessionID, options, "mode", mode); err != nil {
		return err
	} else if found {
		return nil
	}
	klog.V(log.LogLevelDebug).InfoS("ACP agent did not advertise a mode config option", "mode", mode)
	return nil
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
			return true, fmt.Errorf("ACP %s %q is not advertised", configID, value)
		}
		if _, err := connection.SetSessionConfigOption(ctx, acpsdk.SetSessionConfigOptionRequest{
			ValueId: &acpsdk.SetSessionConfigOptionValueId{
				ConfigId:  option.Select.Id,
				SessionId: acpsdk.SessionId(sessionID),
				Value:     wanted,
			},
		}); err != nil {
			return true, fmt.Errorf("ACP session/set_config_option %s: %w", configID, err)
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
