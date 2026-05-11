package opencode

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path"
	"path/filepath"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/deployment-operator/pkg/agentrun-harness/environment"
	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/internal/helpers"
	v1 "github.com/pluralsh/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/deployment-operator/pkg/harness/exec"
	"github.com/pluralsh/deployment-operator/pkg/log"
)

func (in *Opencode) Run(ctx context.Context, options ...exec.Option) {
	go in.start(ctx, options...)
}

func (in *Opencode) Configure(consoleURL, consoleToken, deployToken string) error {
	if err := in.ConfigureSystemPrompt(console.AgentRuntimeTypeOpencode); err != nil {
		return err
	}

	endpoint := in.provider.Endpoint()
	if in.Config.Run.Runtime.Config.OpenCode.Endpoint != "" {
		endpoint = in.Config.Run.Runtime.Config.OpenCode.Endpoint
	}

	input := &ConfigTemplateInput{
		ConsoleURL:    consoleURL,
		ConsoleToken:  consoleToken,
		DeployToken:   deployToken,
		AgentRunID:    in.Config.Run.ID,
		Provider:      in.provider,
		Endpoint:      endpoint,
		Model:         in.model,
		Token:         in.Config.Run.Runtime.Config.OpenCode.Token,
		Mode:          in.Config.Run.Mode,
		ExaMcpConfigs: in.Config.Run.Runtime.ExaMcpConfigs,
	}

	_, content, err := configTemplate(input)
	if err != nil {
		return err
	}

	if err = helpers.File().Create(in.configFilePath(), content, 0644); err != nil {
		return fmt.Errorf("failed configuring opencode config file %q: %w", ConfigFileName, err)
	}

	klog.V(log.LogLevelExtended).InfoS("opencode configured", "configFile", in.configFilePath())
	return nil
}

func (in *Opencode) OnMessage(f func(message *console.AgentMessageAttributes)) {
	in.onMessage = f
}

func (in *Opencode) start(ctx context.Context, options ...exec.Option) {
	configFilePath, err := filepath.Abs(in.configFilePath())
	if err != nil {
		in.Config.ErrorChan <- err
		return
	}

	runCtx, cancel := context.WithCancelCause(ctx)
	defer cancel(nil)

	in.executable = exec.NewExecutable(
		"opencode",
		append(
			options,
			exec.WithEnv([]string{fmt.Sprintf("OPENCODE_CONFIG=%s", configFilePath)}),
			exec.WithArgs(in.args("")),
			exec.WithDir(in.Config.RepositoryDir),
			exec.WithTimeout(in.Config.Run.Runtime.Config.OpenCode.Timeout),
		)...,
	)

	klog.V(log.LogLevelInfo).InfoS("opencode executable configured", "timeout", in.Config.Run.Runtime.Config.OpenCode.Timeout)

	// Send the initial prompt as a message too
	if in.onMessage != nil {
		in.onMessage(&console.AgentMessageAttributes{Message: in.Config.Run.Prompt, Role: console.AiRoleUser})
	}

	state := &streamState{
		events: make(map[string]*Event),
	}

	err = in.executable.RunStream(runCtx, in.streamLineHandler(state, cancel))
	if ctxErr := context.Cause(runCtx); ctxErr != nil {
		klog.V(log.LogLevelDefault).ErrorS(ctxErr, "opencode execution failed")
		in.Config.ErrorChan <- ctxErr
		return
	}

	if err != nil {
		klog.V(log.LogLevelDefault).ErrorS(err, "opencode execution failed")
		in.Config.ErrorChan <- err
		return
	}

	klog.V(log.LogLevelExtended).InfoS("opencode execution finished")
	// FinishedChan is closed by the controller after the babysit loop exits.
}

func (in *Opencode) streamLineHandler(state *streamState, cancel context.CancelCauseFunc) func([]byte) {
	return func(line []byte) {
		in.handleStreamCallback(line, state, cancel)
	}
}

func (in *Opencode) handleStreamCallback(line []byte, state *streamState, cancel context.CancelCauseFunc) {
	err := in.handleStreamLine(line, state)
	if err != nil {
		klog.V(log.LogLevelDebug).ErrorS(err, "failed to process opencode stream line", "line", string(line))
		cancel(err)
		return
	}
}

func (in *Opencode) handleStreamLine(line []byte, state *streamState) error {
	event := &EventListResponse{}
	if err := json.Unmarshal(line, event); err != nil {
		klog.V(log.LogLevelDebug).InfoS("ignoring non-event opencode stream line", "line", string(line), "error", err.Error())
		return nil
	}

	klog.V(log.LogLevelDebug).InfoS("opencode event received", "event", event)
	if event.Error != nil {
		var message string
		if event.Error.Data != nil {
			message = event.Error.Data.Message
		}

		klog.V(log.LogLevelDebug).InfoS(
			"opencode error",
			"name", event.Error.Name,
			"message", message,
			"events", len(state.events),
		)
		return fmt.Errorf("opencode error: %s: %s", event.Error.Name, message)
	}

	in.processEvent(state, *event)
	return nil
}

func (in *Opencode) processEvent(state *streamState, event EventListResponse) {
	id := in.getID(event)
	if len(id) == 0 {
		return
	}

	if in.emitCompletedToolEvent(event) {
		return
	}

	// Step boundaries should not create synthetic aggregated messages.
	// We only aggregate content-bearing events (for example text) and finalize on step_finish.
	if event.Part != nil && event.Part.Type == StreamPartTypeStepStart {
		return
	}

	aggregated, exists := state.events[id]
	if !exists {
		// Ignore step finish without any accumulated message payload.
		if event.Part != nil && event.Part.Type == StreamPartTypeStepFinish {
			return
		}

		aggregated = &Event{}
	}

	aggregated.FromEventResponse(event)
	state.events[id] = aggregated

	if !aggregated.Done {
		return
	}

	aggregated.Sanitize()
	if in.onMessage != nil {
		in.onMessage(aggregated.Message)
	}

	delete(state.events, id)
}

func (in *Opencode) emitCompletedToolEvent(event EventListResponse) bool {
	if event.Part == nil || event.Part.Type != StreamPartTypeTool {
		return false
	}

	if event.Part.State == nil || (event.Part.State.Status != StreamToolStatusCompleted && event.Part.State.Status != StreamToolStatusError) {
		return true
	}

	toolEvent := &Event{}
	toolEvent.FromEventResponse(event)
	toolEvent.Sanitize()

	if in.onMessage != nil {
		in.onMessage(toolEvent.Message)
	}

	return true
}

func (in *Opencode) getID(e EventListResponse) string {
	if e.Part == nil {
		return ""
	}

	return e.Part.MessageID
}

func (in *Opencode) args(prompt string) []string {
	if len(prompt) == 0 {
		prompt = in.Config.Run.Prompt
		if overridePrompt := os.Getenv(environment.EnvOverrideSystemPrompt); len(overridePrompt) > 0 {
			prompt = overridePrompt
		}
	}

	return []string{
		"run",
		"--format", "json",
		"--agent", in.agent(),
		"--model", fmt.Sprintf("%s/%s", in.provider, in.model),
		prompt,
	}
}

func (in *Opencode) agent() string {
	if in.Config.Run.Mode == console.AgentRunModeAnalyze {
		return defaultAnalysisAgent
	}

	return defaultWriteAgent
}

func (in *Opencode) configFilePath() string {
	return path.Join(in.Config.WorkDir, ".opencode", ConfigFileName)
}

func (in *Opencode) ensure() error {
	if len(in.Config.WorkDir) == 0 {
		return fmt.Errorf("work directory is not set")
	}

	if len(in.Config.RepositoryDir) == 0 {
		return fmt.Errorf("repository directory is not set")
	}

	if in.Config.FinishedChan == nil {
		return fmt.Errorf("finished channel is not set")
	}

	if in.Config.ErrorChan == nil {
		return fmt.Errorf("error channel is not set")
	}

	if in.Config.Run == nil {
		return fmt.Errorf("agent run is not set")
	}

	return nil
}

func (in *Opencode) BabysitRun(ctx context.Context, bCtx *v1.BabysitContext) bool {
	if bCtx == nil {
		return false
	}
	configFilePath, err := filepath.Abs(in.configFilePath())
	if err != nil {
		in.Config.ErrorChan <- err
		return false
	}

	runCtx, cancel := context.WithCancelCause(ctx)
	defer cancel(nil)

	in.executable = exec.NewExecutable(
		"opencode",
		exec.WithEnv([]string{fmt.Sprintf("OPENCODE_CONFIG=%s", configFilePath)}),
		exec.WithArgs(in.args(bCtx.Prompt)),
		exec.WithDir(in.Config.RepositoryDir),
		exec.WithTimeout(in.Config.Run.Runtime.Config.OpenCode.Timeout),
	)

	klog.V(log.LogLevelInfo).InfoS("opencode executable configured", "timeout", in.Config.Run.Runtime.Config.OpenCode.Timeout)

	// Send the initial prompt as a message too
	if in.onMessage != nil {
		in.onMessage(&console.AgentMessageAttributes{Message: bCtx.Prompt, Role: console.AiRoleUser})
	}

	state := &streamState{
		events: make(map[string]*Event),
	}

	err = in.executable.RunStream(runCtx, in.streamLineHandler(state, cancel))
	if ctxErr := context.Cause(runCtx); ctxErr != nil {
		klog.V(log.LogLevelDefault).ErrorS(ctxErr, "opencode execution failed")
		in.Config.ErrorChan <- ctxErr
		return false
	}

	if err != nil {
		klog.V(log.LogLevelDefault).ErrorS(err, "opencode execution failed")
		in.Config.ErrorChan <- err
		return false
	}

	klog.V(log.LogLevelExtended).InfoS("opencode execution finished")
	return false
}

func (in *Opencode) ConfigureBabysitRun() error {
	return in.ConfigureSystemPromptForBabysitRun(console.AgentRuntimeTypeOpencode)
}

func New(config v1.Config) v1.Tool {
	provider := EnsureProvider(config.Run.Runtime.Config.OpenCode.Provider, config.Run.IsProxyEnabled())
	model := string(EnsureModel(config.Run.Runtime.Config.OpenCode.Model))

	if provider == ProviderPlural {
		// AI Proxy requires the model in the request to be in format <provider/model>
		// Currently, agent run schema does not provide a way to set a custom AI provider,
		// so we default to OpenAI.
		model = fmt.Sprintf("openai/%s", model)
	}

	result := &Opencode{
		DefaultTool: v1.DefaultTool{Config: config},
		model:       model,
		provider:    provider,
	}

	if err := result.ensure(); err != nil {
		klog.Fatalf("failed to initialize opencode tool: %v", err)
	}

	return result
}
