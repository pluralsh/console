package claude

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/acp"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
)

const claudeACPBinary = "claude-agent-acp"

type Transport struct {
	agent   *Agent
	engine  *acp.Engine
	workDir string
}

var _ toolv1.Transport = (*Transport)(nil)

func NewTransport(agent *Agent) (*Transport, error) {
	if agent == nil {
		return nil, errors.New("claude agent is not set")
	}
	config, err := agent.configWithClaude()
	if err != nil {
		return nil, err
	}
	workDir, err := filepath.Abs(config.WorkDir)
	if err != nil {
		return nil, fmt.Errorf("resolve claude work directory: %w", err)
	}
	return &Transport{agent: agent, engine: acp.NewEngine(), workDir: workDir}, nil
}

func (*Transport) Kind() toolv1.TransportKind {
	return toolv1.TransportKindACP
}
func (*Transport) Capabilities() toolv1.TransportCapabilities {
	return toolv1.TransportCapabilities{SessionResume: true, ToolCallOutputStreaming: false, UsageReporting: true, FileSystemRead: true, FileSystemWrite: true}
}

func (transport *Transport) Turn(ctx context.Context, request toolv1.TurnRequest, sink toolv1.TurnSink) (toolv1.TurnResult, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if err := ctx.Err(); err != nil {
		return toolv1.TurnResult{SessionID: request.SessionID}, err
	}
	modeID, err := transport.agent.modeID(request.Settings.Mode)
	if err != nil {
		return toolv1.TurnResult{SessionID: request.SessionID}, err
	}
	process, err := transport.launch(request.Options)
	if err != nil {
		return toolv1.TurnResult{SessionID: request.SessionID}, err
	}
	result, err := transport.engine.Turn(ctx, process, acp.Request{Cwd: transport.workDir, Prompt: request.Prompt, SessionID: request.SessionID, Settings: acp.SessionSettings{ModeID: modeID, ModelID: request.Settings.Model.Name}}, sink)
	return toolv1.TurnResult{SessionID: result.SessionID}, err
}

func (transport *Transport) launch(options []exec.Option) (*exec.StdioProcess, error) {
	config := transport.agent.config
	claude, err := transport.agent.runConfig(config.Run)
	if err != nil {
		return nil, err
	}
	launchOptions := append([]exec.Option(nil), options...)
	launchOptions = append(launchOptions, exec.WithEnv(transport.agent.env(config)), exec.WithDir(transport.workDir), exec.WithTimeout(claude.Timeout))
	return exec.StartWithStdio(context.Background(), claudeACPBinary, launchOptions...)
}
