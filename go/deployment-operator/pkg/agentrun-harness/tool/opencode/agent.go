package opencode

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/artifacts"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

// Agent owns the provider-specific settings and configuration for OpenCode.
// Turn execution remains the responsibility of a v1.Transport.
type Agent struct {
	config toolv1.Config
}

var _ toolv1.Agent = (*Agent)(nil)

// NewAgent creates an OpenCode Agent for one agent run. Credentials in the run
// configuration are used only while writing provider configuration; resolved
// settings never contain credentials.
func NewAgent(config toolv1.Config) *Agent {
	return &Agent{config: config}
}

// Type identifies the Console runtime implemented by Agent.
func (*Agent) Type() console.AgentRuntimeType {
	return console.AgentRuntimeTypeOpencode
}

// Capabilities advertises the modes supported by OpenCode's configured agents.
func (*Agent) Capabilities() toolv1.AgentCapabilities {
	return toolv1.AgentCapabilities{Modes: []console.AgentRunMode{
		console.AgentRunModeAnalyze,
		console.AgentRunModeWrite,
		console.AgentRunModeReview,
	}}
}

// ResolveSettings resolves provider/model defaults without copying credentials
// into the provider-neutral runtime settings.
func (agent *Agent) ResolveSettings(run *agentrunv1.AgentRun) (toolv1.Settings, error) {
	openCode, err := agent.runConfig(run)
	if err != nil {
		return toolv1.Settings{}, err
	}

	resolved := agent.resolveSettings(openCode.Provider, openCode.Model, openCode.OpenAICompatible, run.IsProxyEnabled())
	return toolv1.Settings{
		Mode: run.Mode,
		Model: toolv1.ModelSelection{
			Provider: agent.aiProvider(resolved.provider),
			Name:     resolved.model,
		},
		Timeout: openCode.Timeout,
		Proxy:   run.IsProxyEnabled(),
	}, nil
}

// Prepare writes the OpenCode system prompt and run skills for a phase.
func (agent *Agent) Prepare(ctx context.Context, request toolv1.FileSystemRequest) error {
	if ctx != nil && ctx.Err() != nil {
		return ctx.Err()
	}
	config, err := agent.configForFilesystem(request)
	if err != nil {
		return err
	}

	defaultTool := toolv1.DefaultTool{Config: config}
	switch request.Phase {
	case toolv1.ConfigurePhaseInitial:
		if err := defaultTool.ConfigureSystemPrompt(console.AgentRuntimeTypeOpencode); err != nil {
			return err
		}
	case toolv1.ConfigurePhaseBabysit:
		if err := defaultTool.ConfigureSystemPromptForBabysitRun(console.AgentRuntimeTypeOpencode); err != nil {
			return err
		}
	default:
		return fmt.Errorf("unsupported opencode configuration phase %q", request.Phase)
	}

	if ctx != nil && ctx.Err() != nil {
		return ctx.Err()
	}
	return defaultTool.ConfigureSkills(agent.skillsPath(config))
}

// Configure writes the native OpenCode provider configuration. Shared prompt
// and skill files are prepared by Prepare, while ConsoleToken is used only for
// this configuration pass when the Plural proxy is selected.
func (agent *Agent) Configure(ctx context.Context, request toolv1.ConfigureRequest) error {
	if ctx != nil && ctx.Err() != nil {
		return ctx.Err()
	}
	if request.Phase != toolv1.ConfigurePhaseInitial && request.Phase != toolv1.ConfigurePhaseBabysit {
		return fmt.Errorf("unsupported opencode configuration phase %q", request.Phase)
	}
	if request.Phase == toolv1.ConfigurePhaseBabysit {
		// Babysit reuses the provider configuration written during the initial
		// pass. Rewriting it would discard the transient proxy token.
		return nil
	}

	openCode, err := agent.configWithOpenCode()
	if err != nil {
		return err
	}
	resolved := agent.resolveSettings(openCode.Provider, openCode.Model, openCode.OpenAICompatible, agent.config.Run.IsProxyEnabled())
	model := request.Settings.Model.Name
	if model == "" {
		model = resolved.model
	}

	if err := agent.configureNative(
		agent.config,
		request.ConsoleURL,
		request.ConsoleToken,
		resolved.provider,
		model,
		resolved.openaiCompatible,
		openCode.Token,
	); err != nil {
		return err
	}
	if ctx != nil {
		return ctx.Err()
	}
	return nil
}

// Export writes the native OpenCode session export into OutputDir and returns
// that directory as the source for the shared artifact builder.
func (agent *Agent) Export(ctx context.Context, request toolv1.ExportRequest) (toolv1.ExportResult, error) {
	if ctx != nil && ctx.Err() != nil {
		return toolv1.ExportResult{}, ctx.Err()
	}
	if request.SessionID == "" {
		return toolv1.ExportResult{}, fmt.Errorf("opencode session id is not set")
	}
	if request.OutputDir == "" {
		return toolv1.ExportResult{}, fmt.Errorf("opencode export output directory is not set")
	}

	if _, err := agent.configWithOpenCode(); err != nil {
		return toolv1.ExportResult{}, err
	}

	outputPath := filepath.Join(request.OutputDir, artifacts.SessionJSONName)
	if err := agent.exportSession(ctx, agent.config, request.SessionID, outputPath); err != nil {
		return toolv1.ExportResult{}, err
	}

	return toolv1.ExportResult{SessionSource: artifacts.SessionSource{
		Path:        request.OutputDir,
		ArchivePath: "opencode",
	}}, nil
}

func (agent *Agent) configWithOpenCode() (*agentrunv1.OpencodeConfig, error) {
	if agent.config.WorkDir == "" {
		return nil, fmt.Errorf("work directory is not set")
	}
	if agent.config.RepositoryDir == "" {
		return nil, fmt.Errorf("repository directory is not set")
	}
	return agent.runConfig(agent.config.Run)
}

func (*Agent) runConfig(run *agentrunv1.AgentRun) (*agentrunv1.OpencodeConfig, error) {
	if run == nil {
		return nil, fmt.Errorf("agent run is not set")
	}
	if run.Runtime == nil || run.Runtime.Config == nil || run.Runtime.Config.OpenCode == nil {
		return nil, fmt.Errorf("opencode runtime configuration is not set")
	}
	return run.Runtime.Config.OpenCode, nil
}

func (*Agent) aiProvider(provider Provider) *console.AiProvider {
	var mapped console.AiProvider
	switch strings.ToLower(string(provider)) {
	case string(ProviderPlural), string(ProviderOpenAI):
		mapped = console.AiProviderOpenai
	case string(ProviderAnthropic):
		mapped = console.AiProviderAnthropic
	case string(ProviderOllama):
		mapped = console.AiProviderOllama
	case string(ProviderAzure):
		mapped = console.AiProviderAzure
	case string(ProviderAmazonBedrock), string(ProviderBedrock):
		mapped = console.AiProviderBedrock
	case string(ProviderGoogleVertex), string(ProviderVertex):
		mapped = console.AiProviderVertex
	case string(ProviderOpenAICompatible):
		mapped = console.AiProviderOpenaiCompatible
	case string(ProviderXAI):
		mapped = console.AiProviderXai
	default:
		return nil
	}
	return &mapped
}

func (agent *Agent) configForFilesystem(request toolv1.FileSystemRequest) (toolv1.Config, error) {
	if request.WorkDir == "" {
		return toolv1.Config{}, fmt.Errorf("work directory is not set")
	}
	if request.RepositoryDir == "" {
		return toolv1.Config{}, fmt.Errorf("repository directory is not set")
	}
	if agent.config.Run == nil {
		return toolv1.Config{}, fmt.Errorf("agent run is not set")
	}

	config := agent.config
	config.WorkDir = request.WorkDir
	config.RepositoryDir = request.RepositoryDir
	return config, nil
}
