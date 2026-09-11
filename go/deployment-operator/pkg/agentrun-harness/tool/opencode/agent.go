package opencode

import (
	"context"
	"fmt"
	"path/filepath"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/artifacts"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

// Agent owns OpenCode's shared preparation and lifecycle entrypoints. Runtime
// settings, native configuration, and ACP environment details live in their
// responsibility-specific files.
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

	// The provider configuration is written once during the initial phase. The
	// runtime supplies the already resolved model for this configuration pass.
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
	if ctx == nil {
		ctx = context.Background()
	}
	if err := ctx.Err(); err != nil {
		return toolv1.ExportResult{}, err
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
