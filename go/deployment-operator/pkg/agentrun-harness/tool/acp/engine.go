// Package acp contains the provider-neutral Agent Client Protocol engine.
// Providers launch their own processes and project their settings into the
// protocol identifiers consumed here.
package acp

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"time"

	acpsdk "github.com/coder/acp-go-sdk"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/usage"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

const defaultStopTimeout = 2 * time.Second

// Engine owns one provider-neutral ACP protocol implementation. It does not
// launch processes or retain provider configuration.
type Engine struct {
	stopTimeout time.Duration
	costs       *usage.Usage
}

func (engine *Engine) setSessionConfig(ctx context.Context, connection *acpsdk.ClientSideConnection, sessionID string, modes *acpsdk.SessionModeState, options []acpsdk.SessionConfigOption, settings SessionSettings) error {
	if err := engine.setModelConfig(ctx, connection, sessionID, options, settings.ModelID); err != nil {
		return err
	}
	return engine.setModeConfig(ctx, connection, sessionID, modes, options, settings.ModeID)
}

func (engine *Engine) setModelConfig(ctx context.Context, connection *acpsdk.ClientSideConnection, sessionID string, options []acpsdk.SessionConfigOption, model string) error {
	if model == "" {
		return nil
	}
	found, err := engine.setConfigOption(ctx, connection, sessionID, options, "model", model)
	if err != nil {
		return err
	}
	if !found {
		klog.V(log.LogLevelDebug).InfoS("ACP agent did not advertise a model config option")
	}
	return nil
}

func (engine *Engine) setModeConfig(ctx context.Context, connection *acpsdk.ClientSideConnection, sessionID string, modes *acpsdk.SessionModeState, options []acpsdk.SessionConfigOption, mode string) error {
	if mode == "" {
		return nil
	}
	if engine.modeAvailable(modes, mode) {
		if _, err := connection.SetSessionMode(ctx, acpsdk.SetSessionModeRequest{SessionId: acpsdk.SessionId(sessionID), ModeId: acpsdk.SessionModeId(mode)}); err != nil {
			return fmt.Errorf("acp session/set_mode: %w", err)
		}
		return nil
	}
	found, err := engine.setConfigOption(ctx, connection, sessionID, options, "mode", mode)
	if err != nil {
		return err
	}
	if !found {
		klog.V(log.LogLevelDebug).InfoS("ACP agent did not advertise a mode config option", "mode", mode)
	}
	return nil
}

func (*Engine) modeAvailable(modes *acpsdk.SessionModeState, mode string) bool {
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

func (engine *Engine) setConfigOption(ctx context.Context, connection *acpsdk.ClientSideConnection, sessionID string, options []acpsdk.SessionConfigOption, configID, value string) (bool, error) {
	for _, option := range options {
		if option.Select == nil || string(option.Select.Id) != configID {
			continue
		}
		wanted := acpsdk.SessionConfigValueId(value)
		if option.Select.CurrentValue == wanted {
			return true, nil
		}
		if !engine.configOptionContains(option.Select.Options, wanted) {
			return true, fmt.Errorf("acp %s %q is not advertised", configID, value)
		}
		_, err := connection.SetSessionConfigOption(ctx, acpsdk.SetSessionConfigOptionRequest{ValueId: &acpsdk.SetSessionConfigOptionValueId{
			ConfigId: option.Select.Id, SessionId: acpsdk.SessionId(sessionID), Value: wanted,
		}})
		if err != nil {
			return true, fmt.Errorf("acp session/set_config_option %s: %w", configID, err)
		}
		return true, nil
	}
	return false, nil
}

func (*Engine) configOptionContains(options acpsdk.SessionConfigSelectOptions, wanted acpsdk.SessionConfigValueId) bool {
	if options.Ungrouped != nil {
		if slices.ContainsFunc(*options.Ungrouped, func(option acpsdk.SessionConfigSelectOption) bool {
			return option.Value == wanted
		}) {
			return true
		}
	}

	if options.Grouped == nil {
		return false
	}

	for _, group := range *options.Grouped {
		if slices.ContainsFunc(group.Options, func(option acpsdk.SessionConfigSelectOption) bool {
			return option.Value == wanted
		}) {
			return true
		}
	}

	return false
}

// Turn drives one ACP process through initialization, session setup, prompt,
// event mapping, and bounded shutdown. The caller owns process launch and
// must pass a process with usable stdin and stdout streams.
func (engine *Engine) Turn(ctx context.Context, process *exec.StdioProcess, request Request, sink Sink) (Result, error) {
	if request.Cwd == "" {
		if process != nil {
			_ = process.Stop()
			_ = process.Wait()
		}
		return Result{SessionID: request.SessionID}, errors.New("acp working directory is not set")
	}
	if sink == nil {
		if process != nil {
			_ = process.Stop()
			_ = process.Wait()
		}
		return Result{}, errors.New("acp turn sink is not set")
	}
	if process == nil || process.Stdin == nil || process.Stdout == nil {
		if process != nil {
			_ = process.Stop()
			_ = process.Wait()
		}
		return Result{}, errors.New("acp process is incomplete")
	}
	if ctx == nil {
		ctx = context.Background()
	}
	attempt := newSessionAttempt(engine, ctx, process, request, sink)
	defer attempt.close()
	err := attempt.run(request.Prompt)
	return Result{SessionID: attempt.sessionID}, err
}

// NewEngine creates an ACP engine with a bounded process shutdown grace
// period.
func NewEngine(config Config) *Engine {
	if config.StopTimeout <= 0 {
		config.StopTimeout = defaultStopTimeout
	}
	return &Engine{
		stopTimeout: config.StopTimeout,
		costs:       usage.New(nil),
	}
}
