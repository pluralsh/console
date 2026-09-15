// Package pi implements the Pi coding-agent runtime for the agent harness.
package pi

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"strings"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/artifacts"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

const (
	piHomeDir     = ".pi"
	piAgentDir    = "agent"
	piSessionsDir = "sessions"
	piSkillsDir   = "skills"
)

// Agent owns Pi's native configuration, shared prompt and skills preparation,
// and staging of Pi's provider-owned session state.
type Agent struct {
	config       toolv1.Config
	consoleURL   string
	consoleToken string
}

var _ toolv1.Agent = (*Agent)(nil)

// NewAgent creates a Pi Agent for one agent run.
func NewAgent(config toolv1.Config) *Agent {
	agent := &Agent{config: config}
	if config.Run != nil && config.Run.PluralCreds != nil && config.Run.PluralCreds.Token != nil {
		agent.consoleToken = *config.Run.PluralCreds.Token
	}
	return agent
}

// Type identifies the Console runtime implemented by Agent.
func (*Agent) Type() console.AgentRuntimeType {
	return console.AgentRuntimeTypePi
}

// Capabilities advertises the modes supported by Pi.
func (*Agent) Capabilities() toolv1.AgentCapabilities {
	return toolv1.AgentCapabilities{Modes: []console.AgentRunMode{
		console.AgentRunModeAnalyze,
		console.AgentRunModeWrite,
		console.AgentRunModeReview,
	}}
}

// Prepare writes Pi's shared system prompt and skills for a configuration
// phase. Native models and MCP configuration are written separately by
// Configure.
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
		err = defaultTool.ConfigureSystemPrompt(console.AgentRuntimeTypePi)
	case toolv1.ConfigurePhaseBabysit:
		err = defaultTool.ConfigureSystemPromptForBabysitRun(console.AgentRuntimeTypePi)
	default:
		return fmt.Errorf("unsupported pi configuration phase %q", request.Phase)
	}
	if err != nil {
		return err
	}

	if err := agent.contextError(ctx); err != nil {
		return err
	}
	return defaultTool.ConfigureSkills(agent.skillsPath(config))
}

// Configure writes Pi's native model and MCP configuration for the initial
// phase. Babysit runs reuse that configuration so transient proxy credentials
// are not replaced.
func (agent *Agent) Configure(ctx context.Context, request toolv1.ConfigureRequest) error {
	if err := agent.contextError(ctx); err != nil {
		return err
	}
	if request.Phase != toolv1.ConfigurePhaseInitial && request.Phase != toolv1.ConfigurePhaseBabysit {
		return fmt.Errorf("unsupported pi configuration phase %q", request.Phase)
	}
	if request.Phase == toolv1.ConfigurePhaseBabysit {
		return nil
	}

	config, err := agent.configWithPi()
	if err != nil {
		return err
	}
	agent.consoleURL = request.ConsoleURL
	if request.ConsoleToken != "" {
		agent.consoleToken = request.ConsoleToken
	}

	return agent.writeNativeConfig(config, request.Settings.Model.Name)
}

// Export stages all native Pi sessions below OutputDir. Pi's ACP adapter
// persists the session JSONL files in the same directory used by the native
// CLI, so the whole sessions tree is retained for artifact uploads.
func (agent *Agent) Export(ctx context.Context, request toolv1.ExportRequest) (toolv1.ExportResult, error) {
	if err := agent.contextError(ctx); err != nil {
		return toolv1.ExportResult{}, err
	}
	if request.SessionID == "" {
		return toolv1.ExportResult{}, errors.New("pi session id is not set")
	}
	if request.OutputDir == "" {
		return toolv1.ExportResult{}, errors.New("pi export output directory is not set")
	}

	config, err := agent.configWithPi()
	if err != nil {
		return toolv1.ExportResult{}, err
	}
	found, err := artifacts.StageSessionDirectory(ctx, agent.sessionsPath(config), request.OutputDir)
	if err != nil {
		return toolv1.ExportResult{}, fmt.Errorf("stage pi sessions: %w", err)
	}
	if !found {
		return toolv1.ExportResult{}, nil
	}

	return toolv1.ExportResult{SessionSource: artifacts.SessionSource{
		Path:        request.OutputDir,
		ArchivePath: piSessionsDir,
	}}, nil
}

func (agent *Agent) configWithPi() (toolv1.Config, error) {
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
	config.WorkDir = request.WorkDir
	config.RepositoryDir = request.RepositoryDir
	return config, nil
}

func (agent *Agent) runConfig(run *agentrunv1.AgentRun) (*agentrunv1.PiConfig, error) {
	if run == nil {
		return nil, errors.New("agent run is not set")
	}
	if run.Runtime == nil || run.Runtime.Config == nil || run.Runtime.Config.Pi == nil {
		return nil, errors.New("pi runtime configuration is not set")
	}
	config := run.Runtime.Config.Pi
	if err := agent.validateProvider(run, config); err != nil {
		return nil, err
	}
	return config, nil
}

func (*Agent) validateProvider(run *agentrunv1.AgentRun, config *agentrunv1.PiConfig) error {
	if run.IsProxyEnabled() || config.Endpoint != nil || config.Provider == "" {
		return nil
	}

	switch strings.ToLower(config.Provider) {
	case providerOpenAI, providerOpenAICompatible, providerAnthropic, providerOllama,
		providerAzure, providerAmazonBedrock, providerBedrock, providerGoogleVertex, providerVertex, providerXAI:
		return nil
	default:
		return fmt.Errorf("unsupported pi provider %q", config.Provider)
	}
}

func (*Agent) piHome(config toolv1.Config) string {
	return filepath.Join(config.WorkDir, piHomeDir, piAgentDir)
}

func (agent *Agent) skillsPath(config toolv1.Config) string {
	return filepath.Join(agent.piHome(config), piSkillsDir)
}

func (agent *Agent) sessionsPath(config toolv1.Config) string {
	return filepath.Join(agent.piHome(config), piSessionsDir)
}

func (*Agent) contextError(ctx context.Context) error {
	if ctx == nil {
		return nil
	}
	return ctx.Err()
}
