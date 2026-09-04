package opencode

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/acp"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
)

const (
	analysisModeID = "analysis"
	reviewModeID   = "review"
	writeModeID    = "autonomous"
)

// Transport invokes OpenCode through its ACP interface. It owns the
// provider-specific process launch and projects Runtime settings into ACP
// model and mode identifiers. The protocol session itself belongs to acp.Engine.
type Transport struct {
	agent         *Agent
	engine        *acp.Engine
	repositoryDir string
}

var _ toolv1.Transport = (*Transport)(nil)

// NewTransport creates the OpenCode ACP transport for an Agent.
func NewTransport(agent *Agent) (*Transport, error) {
	if agent == nil {
		return nil, errors.New("opencode agent is not set")
	}
	if agent.config.RepositoryDir == "" {
		return nil, errors.New("repository directory is not set")
	}
	if _, err := agent.runConfig(agent.config.Run); err != nil {
		return nil, err
	}

	repositoryDir, err := filepath.Abs(agent.config.RepositoryDir)
	if err != nil {
		return nil, fmt.Errorf("resolve opencode repository directory: %w", err)
	}

	return &Transport{
		agent:         agent,
		engine:        acp.NewEngine(acp.Config{}),
		repositoryDir: repositoryDir,
	}, nil
}

// Kind identifies this as an Agent Client Protocol transport.
func (*Transport) Kind() toolv1.TransportKind {
	return toolv1.TransportKindACP
}

// Capabilities reports the ACP features implemented by OpenCode.
func (*Transport) Capabilities() toolv1.TransportCapabilities {
	return toolv1.TransportCapabilities{
		SessionResume:           true,
		ToolCallOutputStreaming: true,
		UsageReporting:          true,
		FileSystemRead:          true,
		FileSystemWrite:         true,
	}
}

// Turn launches OpenCode, then delegates ACP session lifecycle and event
// mapping to the provider-neutral engine.
func (transport *Transport) Turn(ctx context.Context, request toolv1.TurnRequest, sink toolv1.TurnSink) (toolv1.TurnResult, error) {
	settings, err := transport.sessionSettings(request.Settings)
	if err != nil {
		return toolv1.TurnResult{SessionID: request.SessionID}, err
	}

	process, err := transport.launch(ctx, request.Options)
	if err != nil {
		return toolv1.TurnResult{SessionID: request.SessionID}, err
	}

	result, err := transport.engine.Turn(ctx, process, acp.Request{
		Cwd:       transport.repositoryDir,
		Prompt:    request.Prompt,
		SessionID: request.SessionID,
		Settings:  settings,
	}, sink)

	return toolv1.TurnResult{SessionID: result.SessionID}, err
}

func (transport *Transport) launch(ctx context.Context, options []exec.Option) (*exec.StdioProcess, error) {
	if ctx != nil {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
	}
	openCode, err := transport.agent.runConfig(transport.agent.config.Run)
	if err != nil {
		return nil, err
	}

	configPath, err := filepath.Abs(transport.agent.configPath(transport.agent.config))
	if err != nil {
		return nil, fmt.Errorf("resolve opencode ACP config: %w", err)
	}

	launchOptions := append([]exec.Option(nil), options...)
	launchOptions = append(launchOptions,
		exec.WithArgs([]string{"acp"}),
		exec.WithEnv(transport.agent.env(transport.agent.config, configPath)),
		exec.WithDir(transport.repositoryDir),
		exec.WithTimeout(openCode.Timeout),
	)

	// ACP owns cancellation ordering. The engine sends session/cancel before
	// closing stdin or killing the process, so the child must not be tied to
	// the caller's context here.
	return exec.StartWithStdio(context.Background(), "opencode", launchOptions...)
}

func (transport *Transport) sessionSettings(settings toolv1.Settings) (acp.SessionSettings, error) {
	openCode, err := transport.agent.runConfig(transport.agent.config.Run)
	if err != nil {
		return acp.SessionSettings{}, err
	}

	resolved := transport.agent.resolveSettings(openCode.Provider, openCode.Model, openCode.OpenAICompatible, transport.agent.config.Run.IsProxyEnabled())
	model := settings.Model.Name
	if model == "" {
		model = resolved.model
	}

	mode, err := transport.modeID(settings.Mode)
	if err != nil {
		return acp.SessionSettings{}, err
	}

	return acp.SessionSettings{ModeID: mode, ModelID: string(resolved.provider) + "/" + model}, nil
}

func (*Transport) modeID(mode console.AgentRunMode) (string, error) {
	switch mode {
	case console.AgentRunModeAnalyze:
		return analysisModeID, nil
	case console.AgentRunModeReview:
		return reviewModeID, nil
	case console.AgentRunModeWrite:
		return writeModeID, nil
	default:
		return "", fmt.Errorf("unsupported opencode ACP mode %q", mode)
	}
}
