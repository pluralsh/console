package codex

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/samber/lo"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/artifacts"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

// These paths keep Codex's native state, prompt, and skills inside the
// workspace owned by this Agent.
const (
	codexHomeDir   = ".codex"
	codexSkillsDir = "skills"
)

// Agent owns Codex settings, shared prompt and skills preparation, native
// configuration, and staging of Codex's native session data.
type Agent struct {
	config       toolv1.Config
	consoleURL   string
	consoleToken string
}

var _ toolv1.Agent = (*Agent)(nil)

// NewAgent creates a Codex Agent for one agent run.
func NewAgent(config toolv1.Config) *Agent {
	agent := &Agent{config: config}
	if config.Run != nil && config.Run.PluralCreds != nil {
		agent.consoleToken = lo.FromPtr(config.Run.PluralCreds.Token)
	}
	return agent
}

// Type identifies the Console runtime implemented by Agent.
func (*Agent) Type() console.AgentRuntimeType {
	return console.AgentRuntimeTypeCodex
}

// Capabilities advertises the modes supported by Codex profiles.
func (*Agent) Capabilities() toolv1.AgentCapabilities {
	return toolv1.AgentCapabilities{Modes: []console.AgentRunMode{
		console.AgentRunModeAnalyze,
		console.AgentRunModeWrite,
		console.AgentRunModeReview,
	}}
}

// Prepare writes Codex's shared system prompt and skills for a configuration
// phase. Native TOML configuration is written separately by Configure.
func (agent *Agent) Prepare(ctx context.Context, request toolv1.FileSystemRequest) error {
	if err := agent.contextError(ctx); err != nil {
		return err
	}
	config, err := agent.configForFilesystem(request)
	if err != nil {
		return err
	}

	defaultTool := toolv1.DefaultTool{Config: config}
	switch request.Phase {
	case toolv1.ConfigurePhaseInitial:
		err = defaultTool.ConfigureSystemPrompt(console.AgentRuntimeTypeCodex)
	case toolv1.ConfigurePhaseBabysit:
		err = defaultTool.ConfigureSystemPromptForBabysitRun(console.AgentRuntimeTypeCodex)
	default:
		return fmt.Errorf("unsupported codex configuration phase %q", request.Phase)
	}
	if err != nil {
		return err
	}

	if err := agent.contextError(ctx); err != nil {
		return err
	}
	return defaultTool.ConfigureSkills(agent.skillsPath(config))
}

// Configure writes Codex's native TOML configuration for the initial phase.
// Babysit reuses that configuration while refreshing only prompt and skills.
func (agent *Agent) Configure(ctx context.Context, request toolv1.ConfigureRequest) error {
	if err := agent.contextError(ctx); err != nil {
		return err
	}
	if request.Phase != toolv1.ConfigurePhaseInitial && request.Phase != toolv1.ConfigurePhaseBabysit {
		return fmt.Errorf("unsupported codex configuration phase %q", request.Phase)
	}
	if request.Phase == toolv1.ConfigurePhaseBabysit {
		return nil
	}

	config, err := agent.configWithCodex()
	if err != nil {
		return err
	}

	agent.consoleURL = request.ConsoleURL
	if request.ConsoleToken != "" {
		agent.consoleToken = request.ConsoleToken
	}

	model := agent.resolveModelForSettings(config, request.Settings)

	return agent.writeNativeConfig(config, model)
}

// Export stages all native Codex sessions below OutputDir. Codex's session
// filenames and JSONL schema are provider-owned, so the complete sessions tree
// is copied into a disposable staging directory for artifact building.
func (agent *Agent) Export(ctx context.Context, request toolv1.ExportRequest) (toolv1.ExportResult, error) {
	if err := agent.contextError(ctx); err != nil {
		return toolv1.ExportResult{}, err
	}
	if request.SessionID == "" {
		return toolv1.ExportResult{}, fmt.Errorf("codex session id is not set")
	}
	if request.OutputDir == "" {
		return toolv1.ExportResult{}, fmt.Errorf("codex export output directory is not set")
	}

	config, err := agent.configWithCodex()
	if err != nil {
		return toolv1.ExportResult{}, err
	}
	source := filepath.Join(agent.codexHome(config), codexSessionsDir)
	if _, err := os.Stat(source); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return toolv1.ExportResult{}, nil
		}
		return toolv1.ExportResult{}, fmt.Errorf("stat codex sessions: %w", err)
	}

	if err := agent.copySessionDirectory(ctx, source, request.OutputDir); err != nil {
		return toolv1.ExportResult{}, err
	}
	return toolv1.ExportResult{SessionSource: artifacts.SessionSource{
		Path:        request.OutputDir,
		ArchivePath: codexSessionsDir,
	}}, nil
}

func (agent *Agent) configWithCodex() (toolv1.Config, error) {
	if agent.config.WorkDir == "" {
		return toolv1.Config{}, fmt.Errorf("work directory is not set")
	}
	if agent.config.RepositoryDir == "" {
		return toolv1.Config{}, fmt.Errorf("repository directory is not set")
	}
	if _, err := agent.runConfig(agent.config.Run); err != nil {
		return toolv1.Config{}, err
	}
	return agent.config, nil
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

func (*Agent) runConfig(run *agentrunv1.AgentRun) (*agentrunv1.CodexConfig, error) {
	if run == nil {
		return nil, fmt.Errorf("agent run is not set")
	}
	if run.Runtime == nil || run.Runtime.Config == nil || run.Runtime.Config.Codex == nil {
		return nil, fmt.Errorf("codex runtime configuration is not set")
	}
	return run.Runtime.Config.Codex, nil
}

func (agent *Agent) codexHome(config toolv1.Config) string {
	return filepath.Join(config.WorkDir, codexHomeDir)
}

func (agent *Agent) skillsPath(config toolv1.Config) string {
	return filepath.Join(agent.codexHome(config), codexSkillsDir)
}

func (agent *Agent) systemPromptPath(config toolv1.Config) (string, error) {
	return filepath.Abs(filepath.Join(agent.codexHome(config), toolv1.SystemPromptFile))
}

func (*Agent) contextError(ctx context.Context) error {
	if ctx == nil {
		return nil
	}
	return ctx.Err()
}
