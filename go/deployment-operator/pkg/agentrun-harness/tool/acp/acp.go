// Package acp contains the provider-neutral Agent Client Protocol harness.
// Provider adapters supply process launch, configuration, and native artifact
// export callbacks while this package owns the ACP session lifecycle and
// Console message mapping.
package acp

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	acpsdk "github.com/coder/acp-go-sdk"
	"k8s.io/klog/v2"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/artifacts"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/usage"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

const (
	defaultStopTimeout = 2 * time.Second
)

// LaunchFunc starts one ACP agent process. A new process is started for every
// prompt, including resumed prompts; the ACP session itself remains the
// durable conversation state.
type LaunchFunc func(context.Context, []exec.Option) (*exec.StdioProcess, error)

// ConfigureFunc writes provider configuration and any provider system prompt
// files needed before a run.
type ConfigureFunc func(consoleURL, consoleToken string) error

// ExportFunc exports a provider-native session to outputPath.
type ExportFunc func(context.Context, string, string) error

// Option configures the provider-neutral ACP tool.
type Option func(*Tool)

// WithLauncher supplies the provider-specific ACP process launcher.
func WithLauncher(launch LaunchFunc) Option {
	return func(tool *Tool) { tool.launch = launch }
}

// WithConfigure supplies the provider-specific configuration callback.
func WithConfigure(configure ConfigureFunc) Option {
	return func(tool *Tool) { tool.configure = configure }
}

// WithBabysitConfigure supplies the provider-specific babysit configuration
// callback.
func WithBabysitConfigure(configure func() error) Option {
	return func(tool *Tool) { tool.configureBabysit = configure }
}

// WithExporter supplies provider-native session export behavior.
func WithExporter(export ExportFunc) Option {
	return func(tool *Tool) { tool.export = export }
}

// WithProviderName sets the name used when building the upload archive.
func WithProviderName(name string) Option {
	return func(tool *Tool) { tool.providerName = name }
}

// WithMode sets the provider ACP session mode. Empty mode leaves the agent's
// negotiated default untouched.
func WithMode(mode string) Option {
	return func(tool *Tool) { tool.mode = mode }
}

// WithModel sets the provider/model selection used by ACP session config
// options. The value must use the provider/model form advertised by the
// provider (for example, "openai/gpt-5.4").
func WithModel(model string) Option {
	return func(tool *Tool) { tool.model = model }
}

// WithStopTimeout sets the bounded wait after session/cancel before the agent
// process is killed.
func WithStopTimeout(timeout time.Duration) Option {
	return func(tool *Tool) {
		if timeout > 0 {
			tool.stopTimeout = timeout
		}
	}
}

var _ toolv1.Tool = (*Tool)(nil)

// Tool implements v1.Tool for an ACP-speaking provider.
type Tool struct {
	toolv1.DefaultTool

	launch           LaunchFunc
	configure        ConfigureFunc
	configureBabysit func() error
	export           ExportFunc
	providerName     string
	mode             string

	stopTimeout time.Duration
	model       string

	mu        sync.RWMutex
	onMessage toolv1.MessageCallback
	sessionID string
}

// New creates a provider-neutral ACP tool. Provider adapters normally pass
// WithLauncher, WithConfigure, WithBabysitConfigure, and WithExporter.
func New(config toolv1.Config, options ...Option) *Tool {
	if config.Usage == nil {
		config.Usage = usage.New(nil)
	}
	tool := &Tool{
		DefaultTool:  toolv1.DefaultTool{Config: config},
		providerName: "acp",
		stopTimeout:  defaultStopTimeout,
	}
	for _, option := range options {
		option(tool)
	}
	return tool
}

// Run starts the initial ACP prompt in the background.
func (tool *Tool) Run(ctx context.Context, options ...exec.Option) {
	initialOptions := append([]exec.Option(nil), options...)
	go func() {
		if tool.Config.SkipInitialRun {
			return
		}
		if tool.Config.Run == nil {
			tool.reportError(errors.New("agent run is not set"))
			return
		}
		tool.emit(&console.AgentMessageAttributes{Message: tool.Config.Run.Prompt, Role: console.AiRoleUser}, "")
		if err := tool.runPromptWithOptions(ctx, tool.Config.Run.Prompt, initialOptions); err != nil {
			tool.reportError(err)
		}
	}()
}

// BabysitRun resumes the current ACP session when the babysit loop provides a
// changed prompt. A nil context means no prompt is needed.
func (tool *Tool) BabysitRun(ctx context.Context, babysit *toolv1.BabysitContext) bool {
	if babysit == nil {
		return false
	}
	tool.emit(&console.AgentMessageAttributes{Message: babysit.Prompt, Role: console.AiRoleUser}, "")
	if err := tool.runPrompt(ctx, babysit.Prompt); err != nil {
		tool.reportError(err)
	}
	return false
}

// Configure configures the provider adapter.
func (tool *Tool) Configure(consoleURL, consoleToken string) error {
	if tool.configure == nil {
		return errors.New("acp configure function is not set")
	}
	return tool.configure(consoleURL, consoleToken)
}

// ConfigureBabysitRun configures provider files used by resumed prompts.
func (tool *Tool) ConfigureBabysitRun() error {
	if tool.configureBabysit == nil {
		return nil
	}
	return tool.configureBabysit()
}

// OnMessage registers the Console message callback.
func (tool *Tool) OnMessage(callback toolv1.MessageCallback) {
	tool.mu.Lock()
	tool.onMessage = callback
	tool.mu.Unlock()
}

// FollowUpRun resumes the current ACP session. It deliberately does not emit
// the user prompt because the controller persists follow-up prompts itself.
func (tool *Tool) FollowUpRun(ctx context.Context, prompt string) error {
	return tool.runPrompt(ctx, prompt)
}

// UploadArtifacts exports and archives the native ACP provider session.
func (tool *Tool) UploadArtifacts(ctx context.Context) (*artifacts.UploadArtifacts, error) {
	// Kept in a small adapter method so provider-specific export remains outside
	// the protocol implementation.
	if tool.export == nil {
		return nil, errors.New("acp session exporter is not set")
	}
	tool.mu.RLock()
	sessionID := tool.sessionID
	providerName := tool.providerName
	tool.mu.RUnlock()
	if sessionID == "" {
		return nil, errors.New("acp session id is not set")
	}

	sourcePath, err := os.MkdirTemp(tool.Config.WorkDir, "acp-session-export-*")
	if err != nil {
		return nil, fmt.Errorf("create acp session export dir: %w", err)
	}
	defer os.RemoveAll(sourcePath)

	sessionPath := filepath.Join(sourcePath, artifacts.SessionJSONName)
	if err := tool.export(ctx, sessionPath, sessionID); err != nil {
		return nil, err
	}
	return tool.BuildUploadArtifacts(ctx, artifacts.BuildArtifactsOptions{
		Provider: providerName,
		Source: artifacts.SessionSource{
			Path:        sourcePath,
			ArchivePath: providerName,
		},
		SessionID: sessionID,
	})
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
		if process != nil {
			_ = process.Stop()
			_ = process.Wait()
		}
		return nil, errors.New("acp launcher returned an incomplete stdio process")
	}
	return newSessionAttempt(tool, ctx, process, priorSessionID), nil
}

func (tool *Tool) reportError(err error) {
	if err == nil || tool.Config.ErrorChan == nil {
		return
	}
	klog.V(log.LogLevelDefault).ErrorS(err, "ACP execution failed")
	tool.Config.ErrorChan <- err
}

func (tool *Tool) emit(message *console.AgentMessageAttributes, callID string) {
	if message == nil {
		return
	}
	tool.mu.RLock()
	callback := tool.onMessage
	tool.mu.RUnlock()
	if callback == nil {
		return
	}
	defer func() {
		if recovered := recover(); recovered != nil {
			klog.ErrorS(fmt.Errorf("panic in acp message callback: %v", recovered), "ACP message callback panicked")
		}
	}()
	callback(message, callID)
}

func (tool *Tool) setSessionID(sessionID string) {
	tool.mu.Lock()
	tool.sessionID = sessionID
	tool.mu.Unlock()
}

func (tool *Tool) sessionIDValue() string {
	tool.mu.RLock()
	defer tool.mu.RUnlock()
	return tool.sessionID
}

func (tool *Tool) setSessionConfig(ctx context.Context, connection *acpsdk.ClientSideConnection, sessionID string, modes *acpsdk.SessionModeState, options []acpsdk.SessionConfigOption) error {
	tool.mu.RLock()
	mode := tool.mode
	model := tool.model
	tool.mu.RUnlock()

	if err := tool.setModelConfig(ctx, connection, sessionID, options, model); err != nil {
		return err
	}
	return tool.setModeConfig(ctx, connection, sessionID, modes, options, mode)
}

func (tool *Tool) setModelConfig(ctx context.Context, connection *acpsdk.ClientSideConnection, sessionID string, options []acpsdk.SessionConfigOption, model string) error {
	if model == "" {
		return nil
	}
	found, err := tool.setConfigOption(ctx, connection, sessionID, options, "model", model)
	if err != nil {
		return err
	}
	if !found {
		klog.V(log.LogLevelDebug).InfoS("ACP agent did not advertise a model config option")
	}
	return nil
}

func (tool *Tool) setModeConfig(ctx context.Context, connection *acpsdk.ClientSideConnection, sessionID string, modes *acpsdk.SessionModeState, options []acpsdk.SessionConfigOption, mode string) error {
	if mode == "" {
		return nil
	}
	if tool.modeAvailable(modes, mode) {
		if _, err := connection.SetSessionMode(ctx, acpsdk.SetSessionModeRequest{
			SessionId: acpsdk.SessionId(sessionID),
			ModeId:    acpsdk.SessionModeId(mode),
		}); err != nil {
			return fmt.Errorf("acp session/set_mode: %w", err)
		}
		return nil
	}
	if found, err := tool.setConfigOption(ctx, connection, sessionID, options, "mode", mode); err != nil {
		return err
	} else if found {
		return nil
	}
	klog.V(log.LogLevelDebug).InfoS("ACP agent did not advertise a mode config option", "mode", mode)
	return nil
}

func (tool *Tool) modeAvailable(modes *acpsdk.SessionModeState, mode string) bool {
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

func (tool *Tool) setConfigOption(ctx context.Context, connection *acpsdk.ClientSideConnection, sessionID string, options []acpsdk.SessionConfigOption, configID, value string) (bool, error) {
	for _, option := range options {
		if option.Select == nil || string(option.Select.Id) != configID {
			continue
		}
		wanted := acpsdk.SessionConfigValueId(value)
		if option.Select.CurrentValue == wanted {
			return true, nil
		}
		if !tool.configOptionContains(option.Select.Options, wanted) {
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

func (tool *Tool) configOptionContains(options acpsdk.SessionConfigSelectOptions, wanted acpsdk.SessionConfigValueId) bool {
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
