package gemini

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/artifacts"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

const (
	geminiHomeDir                   = ".gemini"
	geminiSkillsDir                 = "skills"
	geminiChatsDir                  = "chats"
	geminiCompatibilityInstructions = `

Gemini CLI compatibility: do not use command substitution forms such as $(), backticks, <(), or >(), because the CLI blocks them even in yolo mode. Use arithmetic loops, shell builtins, temporary files, or separate commands instead.
`
)

type Agent struct {
	config toolv1.Config
}

var _ toolv1.Agent = (*Agent)(nil)

func NewAgent(config toolv1.Config) *Agent {
	return &Agent{config: config}
}

func (*Agent) Type() console.AgentRuntimeType {
	return console.AgentRuntimeTypeGemini
}

func (*Agent) Capabilities() toolv1.AgentCapabilities {
	return toolv1.AgentCapabilities{Modes: []console.AgentRunMode{
		console.AgentRunModeAnalyze,
		console.AgentRunModeWrite,
		console.AgentRunModeReview,
	}}
}

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
		err = defaultTool.ConfigureSystemPrompt(console.AgentRuntimeTypeGemini)
	case toolv1.ConfigurePhaseBabysit:
		err = defaultTool.ConfigureSystemPromptForBabysitRun(console.AgentRuntimeTypeGemini)
	default:
		return fmt.Errorf("unsupported gemini configuration phase %q", request.Phase)
	}
	if err != nil {
		return err
	}
	if err := agent.contextError(ctx); err != nil {
		return err
	}
	if err := agent.appendCompatibilityInstructions(config); err != nil {
		return err
	}
	return defaultTool.ConfigureSkills(agent.skillsPath(config))
}

func (agent *Agent) Configure(ctx context.Context, request toolv1.ConfigureRequest) error {
	if err := agent.contextError(ctx); err != nil {
		return err
	}
	if request.Phase != toolv1.ConfigurePhaseInitial && request.Phase != toolv1.ConfigurePhaseBabysit {
		return fmt.Errorf("unsupported gemini configuration phase %q", request.Phase)
	}
	if request.Phase == toolv1.ConfigurePhaseBabysit {
		return nil
	}

	config, err := agent.configWithGemini()
	if err != nil {
		return err
	}
	return agent.writeNativeConfig(config, request.Settings.Model.Name)
}

func (agent *Agent) Export(ctx context.Context, request toolv1.ExportRequest) (toolv1.ExportResult, error) {
	if err := agent.contextError(ctx); err != nil {
		return toolv1.ExportResult{}, err
	}
	if request.SessionID == "" {
		return toolv1.ExportResult{}, errors.New("gemini session id is not set")
	}
	if request.OutputDir == "" {
		return toolv1.ExportResult{}, errors.New("gemini export output directory is not set")
	}
	config, err := agent.configWithGemini()
	if err != nil {
		return toolv1.ExportResult{}, err
	}

	source := agent.chatsPath(config)
	found, err := artifacts.StageSessionDirectory(ctx, source, request.OutputDir)
	if err != nil {
		return toolv1.ExportResult{}, fmt.Errorf("stage gemini chats: %w", err)
	}
	if !found {
		return toolv1.ExportResult{}, nil
	}
	return toolv1.ExportResult{SessionSource: artifacts.SessionSource{
		Path: request.OutputDir, ArchivePath: geminiChatsDir,
	}}, nil
}

func (agent *Agent) configWithGemini() (toolv1.Config, error) {
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

func (*Agent) runConfig(run *agentrunv1.AgentRun) (*agentrunv1.GeminiConfig, error) {
	if run == nil {
		return nil, errors.New("agent run is not set")
	}
	if run.Runtime == nil || run.Runtime.Config == nil || run.Runtime.Config.Gemini == nil {
		return nil, errors.New("gemini runtime configuration is not set")
	}
	return run.Runtime.Config.Gemini, nil
}

func (agent *Agent) geminiHome(config toolv1.Config) string {
	return filepath.Join(config.WorkDir, geminiHomeDir)
}

func (agent *Agent) skillsPath(config toolv1.Config) string {
	return filepath.Join(agent.geminiHome(config), geminiSkillsDir)
}

func (agent *Agent) chatsPath(config toolv1.Config) string {
	return filepath.Join(agent.geminiHome(config), "tmp", "plural", geminiChatsDir)
}

func (agent *Agent) appendCompatibilityInstructions(config toolv1.Config) error {
	promptPath := filepath.Join(agent.geminiHome(config), toolv1.SystemPromptFile)
	prompt, err := os.OpenFile(promptPath, os.O_WRONLY|os.O_APPEND, 0)
	if err != nil {
		return fmt.Errorf("open Gemini system prompt for compatibility instructions: %w", err)
	}

	written, err := io.WriteString(prompt, geminiCompatibilityInstructions)
	if err != nil {
		_ = prompt.Close()
		return fmt.Errorf("append Gemini compatibility instructions: %w", err)
	}
	if written != len(geminiCompatibilityInstructions) {
		_ = prompt.Close()
		return fmt.Errorf("append Gemini compatibility instructions: %w", io.ErrShortWrite)
	}
	if err := prompt.Close(); err != nil {
		return fmt.Errorf("close Gemini system prompt: %w", err)
	}
	return nil
}

func (*Agent) contextError(ctx context.Context) error {
	if ctx == nil {
		return nil
	}
	return ctx.Err()
}
