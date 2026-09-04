package codex

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/acp"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
)

// The agent image supplies this executable as Codex's ACP adapter.
const codexACPBinary = "codex-acp"

// Transport invokes Codex through its ACP adapter. It owns process launch and
// projects runtime settings into ACP identifiers; acp.Engine owns the protocol.
type Transport struct {
	agent         *Agent
	engine        *acp.Engine
	repositoryDir string
}

var _ toolv1.Transport = (*Transport)(nil)

// NewTransport creates a Codex ACP transport for an Agent.
func NewTransport(agent *Agent) (*Transport, error) {
	if agent == nil {
		return nil, errors.New("codex agent is not set")
	}
	config, err := agent.configWithCodex()
	if err != nil {
		return nil, err
	}
	repositoryDir, err := filepath.Abs(config.RepositoryDir)
	if err != nil {
		return nil, fmt.Errorf("resolve codex repository directory: %w", err)
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

// Capabilities reports the ACP features implemented by Codex.
func (*Transport) Capabilities() toolv1.TransportCapabilities {
	return toolv1.TransportCapabilities{
		SessionResume:           true,
		ToolCallOutputStreaming: true,
		UsageReporting:          true,
		FileSystemRead:          true,
		FileSystemWrite:         true,
	}
}

// Turn launches codex-acp and delegates session lifecycle and event mapping to
// the provider-neutral ACP engine.
func (transport *Transport) Turn(ctx context.Context, request toolv1.TurnRequest, sink toolv1.TurnSink) (toolv1.TurnResult, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if err := ctx.Err(); err != nil {
		return toolv1.TurnResult{SessionID: request.SessionID}, err
	}

	model, reasoning, modeID, err := transport.agent.resolveACPSettings(request.Settings)
	if err != nil {
		return toolv1.TurnResult{SessionID: request.SessionID}, err
	}
	process, err := transport.launch(request.Options, model)
	if err != nil {
		return toolv1.TurnResult{SessionID: request.SessionID}, err
	}
	result, err := transport.engine.Turn(ctx, process, acp.Request{
		Cwd:       transport.repositoryDir,
		Prompt:    request.Prompt,
		SessionID: request.SessionID,
		Settings:  acp.SessionSettings{ModeID: modeID, ModelID: model, Reasoning: reasoning},
	}, sink)
	return toolv1.TurnResult{SessionID: result.SessionID}, err
}

func (transport *Transport) launch(options []exec.Option, model string) (*exec.StdioProcess, error) {
	config := transport.agent.config

	provider := transport.agent.resolveACPProvider(config)
	env, err := transport.agent.env(config, model, provider)
	if err != nil {
		return nil, err
	}

	launchOptions := append([]exec.Option(nil), options...)
	launchOptions = append(launchOptions,
		exec.WithEnv(env),
		exec.WithDir(transport.repositoryDir),
		exec.WithTimeout(config.Run.Runtime.Config.Codex.Timeout),
	)
	// ACP owns cancellation ordering. The engine sends session/cancel before
	// closing stdin or killing the process, so the child is detached from ctx.
	return exec.StartWithStdio(context.Background(), codexACPBinary, launchOptions...)
}
