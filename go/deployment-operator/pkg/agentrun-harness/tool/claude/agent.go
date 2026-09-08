package claude

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/artifacts"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

const (
	claudeConfigDir   = ".claude"
	claudeSkillsDir   = "skills"
	claudeProjectsDir = "projects"
	claudePromptFile  = "CLAUDE.md"
)

// Agent owns Claude's native configuration, prompt and skills preparation,
// and staging of Claude's provider-owned session state.
type Agent struct {
	config       toolv1.Config
	consoleURL   string
	consoleToken string
}

var _ toolv1.Agent = (*Agent)(nil)

func NewAgent(config toolv1.Config) *Agent {
	return &Agent{config: config}
}

func (*Agent) Type() console.AgentRuntimeType {
	return console.AgentRuntimeTypeClaude
}

func (*Agent) Capabilities() toolv1.AgentCapabilities {
	return toolv1.AgentCapabilities{Modes: []console.AgentRunMode{
		console.AgentRunModeAnalyze,
		console.AgentRunModeWrite,
		console.AgentRunModeReview,
	}}
}

// Prepare writes the prompt both at the legacy generated path and at Claude's
// configured memory path. The latter is read by the native CLI launched by the
// ACP adapter, which cannot receive a system-prompt option through acp.Engine.
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
		err = defaultTool.ConfigureSystemPrompt(console.AgentRuntimeTypeClaude)
	case toolv1.ConfigurePhaseBabysit:
		err = defaultTool.ConfigureSystemPromptForBabysitRun(console.AgentRuntimeTypeClaude)
	default:
		return fmt.Errorf("unsupported claude configuration phase %q", request.Phase)
	}
	if err != nil {
		return err
	}
	if err := agent.writeClaudePrompt(config); err != nil {
		return err
	}
	if err := agent.contextError(ctx); err != nil {
		return err
	}
	return defaultTool.ConfigureSkills(agent.skillsPath(config))
}

func (agent *Agent) Configure(ctx context.Context, request toolv1.ConfigureRequest) error {
	if err := agent.contextError(ctx); err != nil {
		return err
	}
	if request.Phase != toolv1.ConfigurePhaseInitial && request.Phase != toolv1.ConfigurePhaseBabysit {
		return fmt.Errorf("unsupported claude configuration phase %q", request.Phase)
	}
	if request.Phase == toolv1.ConfigurePhaseBabysit {
		return nil
	}

	config, err := agent.configWithClaude()
	if err != nil {
		return err
	}
	agent.consoleURL = request.ConsoleURL
	if request.ConsoleToken != "" {
		agent.consoleToken = request.ConsoleToken
	}
	return agent.writeNativeConfig(config, request.Settings.Model.Name)
}

func (agent *Agent) Export(ctx context.Context, request toolv1.ExportRequest) (toolv1.ExportResult, error) {
	if err := agent.contextError(ctx); err != nil {
		return toolv1.ExportResult{}, err
	}
	if request.SessionID == "" {
		return toolv1.ExportResult{}, errors.New("claude session id is not set")
	}
	if request.OutputDir == "" {
		return toolv1.ExportResult{}, errors.New("claude export output directory is not set")
	}
	config, err := agent.configWithClaude()
	if err != nil {
		return toolv1.ExportResult{}, err
	}
	source := filepath.Join(agent.configPath(config), claudeProjectsDir)
	if _, err := os.Stat(source); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return toolv1.ExportResult{}, nil
		}
		return toolv1.ExportResult{}, fmt.Errorf("stat claude projects: %w", err)
	}
	if err := agent.copySessionDirectory(ctx, source, request.OutputDir); err != nil {
		return toolv1.ExportResult{}, err
	}
	return toolv1.ExportResult{SessionSource: artifacts.SessionSource{
		Path: request.OutputDir, ArchivePath: claudeProjectsDir,
	}}, nil
}

func (agent *Agent) configWithClaude() (toolv1.Config, error) {
	if agent.config.WorkDir == "" {
		return toolv1.Config{}, errors.New("work directory is not set")
	}
	if agent.config.RepositoryDir == "" {
		return toolv1.Config{}, errors.New("repository directory is not set")
	}
	if _, err := agent.runConfig(agent.config.Run); err != nil {
		return toolv1.Config{}, err
	}
	return agent.config, nil
}

func (agent *Agent) configForFilesystem(request toolv1.FileSystemRequest) (toolv1.Config, error) {
	if request.WorkDir == "" {
		return toolv1.Config{}, errors.New("work directory is not set")
	}
	if request.RepositoryDir == "" {
		return toolv1.Config{}, errors.New("repository directory is not set")
	}
	if agent.config.Run == nil {
		return toolv1.Config{}, errors.New("agent run is not set")
	}
	config := agent.config
	config.WorkDir, config.RepositoryDir = request.WorkDir, request.RepositoryDir
	return config, nil
}

func (*Agent) runConfig(run *agentrunv1.AgentRun) (*agentrunv1.ClaudeConfig, error) {
	if run == nil {
		return nil, errors.New("agent run is not set")
	}
	if run.Runtime == nil || run.Runtime.Config == nil || run.Runtime.Config.Claude == nil {
		return nil, errors.New("claude runtime configuration is not set")
	}
	return run.Runtime.Config.Claude, nil
}

func (*Agent) configPath(config toolv1.Config) string {
	return filepath.Join(config.WorkDir, claudeConfigDir)
}

func (agent *Agent) skillsPath(config toolv1.Config) string {
	return filepath.Join(agent.configPath(config), claudeSkillsDir)
}
func (agent *Agent) promptPath(config toolv1.Config) string {
	return filepath.Join(agent.configPath(config), claudePromptFile)
}

func (agent *Agent) writeClaudePrompt(config toolv1.Config) error {
	source := filepath.Join(agent.configPath(config), "prompts", toolv1.SystemPromptFile)
	content, err := os.ReadFile(source)
	if err != nil {
		return fmt.Errorf("read rendered claude prompt: %w", err)
	}
	if err := os.WriteFile(agent.promptPath(config), content, 0644); err != nil {
		return fmt.Errorf("write claude memory prompt: %w", err)
	}
	return nil
}

func (*Agent) contextError(ctx context.Context) error {
	if ctx == nil {
		return nil
	}
	return ctx.Err()
}
