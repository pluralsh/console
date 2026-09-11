package pi

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

const piACPBinary = "pi-acp"

// Transport invokes Pi through its ACP adapter. It owns process launch and
// projects runtime settings into ACP identifiers; acp.Engine owns the
// protocol, event mapping, and session lifecycle.
type Transport struct {
	agent         *Agent
	engine        *acp.Engine
	repositoryDir string
}

var _ toolv1.Transport = (*Transport)(nil)

// NewTransport creates a Pi ACP transport for an Agent.
func NewTransport(agent *Agent) (*Transport, error) {
	if agent == nil {
		return nil, errors.New("pi agent is not set")
	}
	config, err := agent.configWithPi()
	if err != nil {
		return nil, err
	}
	repositoryDir, err := filepath.Abs(config.RepositoryDir)
	if err != nil {
		return nil, fmt.Errorf("resolve pi repository directory: %w", err)
	}
	return &Transport{
		agent:         agent,
		engine:        acp.NewEngine(acp.WithSessionRestorer(acp.LoadSession)),
		repositoryDir: repositoryDir,
	}, nil
}

// Kind identifies this as an Agent Client Protocol transport.
func (*Transport) Kind() toolv1.TransportKind {
	return toolv1.TransportKindACP
}

// Capabilities reports the ACP features implemented by Pi. Pi performs
// filesystem operations locally, while shared write permission follows the
// agent run mode for any ACP filesystem requests.
func (transport *Transport) Capabilities() toolv1.TransportCapabilities {
	return toolv1.TransportCapabilities{
		SessionResume:           true,
		ToolCallOutputStreaming: true,
		UsageReporting:          true,
		FileSystemRead:          true,
		FileSystemWrite:         transport.agent.config.Run.Mode == console.AgentRunModeWrite,
	}
}

// Turn launches pi-acp and delegates session lifecycle and event mapping to
// the provider-neutral ACP engine.
func (transport *Transport) Turn(ctx context.Context, request toolv1.TurnRequest, sink toolv1.TurnSink) (toolv1.TurnResult, error) {
	if ctx == nil {
		return toolv1.TurnResult{SessionID: request.SessionID}, errors.New("pi turn context is not set")
	}
	if err := ctx.Err(); err != nil {
		return toolv1.TurnResult{SessionID: request.SessionID}, err
	}

	modelID := transport.modelID(request.Settings)
	process, err := transport.launchWithContext(ctx, request.Options)
	if err != nil {
		return toolv1.TurnResult{SessionID: request.SessionID}, err
	}
	result, err := transport.engine.Turn(ctx, process, acp.Request{
		Cwd:             transport.repositoryDir,
		Prompt:          request.Prompt,
		SessionID:       request.SessionID,
		Settings:        acp.SessionSettings{ModelID: modelID},
		FileSystemWrite: transport.Capabilities().FileSystemWrite,
	}, sink)
	return toolv1.TurnResult{SessionID: result.SessionID}, err
}

func (transport *Transport) modelID(settings toolv1.Settings) string {
	provider := transport.agent.resolvedProvider(transport.agent.config)
	model := settings.Model.Name
	if model == "" {
		model = defaultModel
	}
	if provider == providerPlural {
		return provider + "/" + model
	}
	return provider + "/" + stripModelProvider(model, provider, "")
}

func (transport *Transport) launch(options []exec.Option) (*exec.StdioProcess, error) {
	return transport.launchWithContext(context.Background(), options)
}

func (transport *Transport) launchWithContext(ctx context.Context, options []exec.Option) (*exec.StdioProcess, error) {
	config := transport.agent.config
	pi, err := transport.agent.runConfig(config.Run)
	if err != nil {
		return nil, err
	}

	launchOptions := append([]exec.Option(nil), options...)
	launchOptions = append(launchOptions,
		exec.WithEnv(transport.agent.env(config)),
		exec.WithDir(transport.repositoryDir),
		exec.WithTimeout(pi.Timeout),
	)
	// ACP owns cancellation ordering. The engine sends session/cancel before
	// closing stdin or killing the process, so the child is detached from ctx.
	return exec.StartWithStdio(context.WithoutCancel(ctx), piACPBinary, launchOptions...)
}
