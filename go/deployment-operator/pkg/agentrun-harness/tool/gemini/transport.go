package gemini

import (
	"context"
	"errors"
	"fmt"
	"math"
	"path/filepath"
	"strconv"

	acpsdk "github.com/coder/acp-go-sdk"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/acp"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
)

const (
	geminiBinary            = "gemini"
	geminiACPFlag           = "--acp"
	geminiModelFlag         = "--model"
	geminiApprovalModeFlag  = "--approval-mode=yolo"
	geminiAPIKeyEnv         = "GEMINI_API_KEY"
	geminiAPIBaseURLEnv     = "GEMINI_API_BASE_URL"
	geminiTrustWorkspaceEnv = "GEMINI_CLI_TRUST_WORKSPACE"
	geminiHomeEnv           = "GEMINI_CLI_HOME"
	geminiTrustWorkspace    = "true"
	geminiAPIKeyAuthMethod  = "gemini-api-key"
)

type Transport struct {
	agent   *Agent
	engine  *acp.Engine
	workDir string
}

var _ toolv1.Transport = (*Transport)(nil)

func NewTransport(agent *Agent) (*Transport, error) {
	if agent == nil {
		return nil, errors.New("gemini agent is not set")
	}
	config, err := agent.configWithGemini()

	if err != nil {
		return nil, err
	}
	workDir, err := filepath.Abs(config.WorkDir)

	if err != nil {
		return nil, fmt.Errorf("resolve gemini work directory: %w", err)
	}

	result := &Transport{
		agent:   agent,
		workDir: workDir,
	}

	engine := acp.NewEngine(
		acp.WithAuthenticationMethod(geminiAPIKeyAuthMethod),
		acp.WithUsageResolver(result.toUsage),
	)

	result.engine = engine
	return result, nil
}

func (*Transport) Kind() toolv1.TransportKind {
	return toolv1.TransportKindACP
}

func (transport *Transport) Capabilities() toolv1.TransportCapabilities {
	return toolv1.TransportCapabilities{
		// Gemini CLI v0.59.0 session/load can corrupt same-minute saved sessions
		// and fail with "No previous sessions found". Revisit on future upgrades.
		// Ref: https://github.com/google-gemini/gemini-cli/issues/28693
		SessionResume:           false,
		ToolCallOutputStreaming: false,
		UsageReporting:          true,
		FileSystemRead:          true,
		FileSystemWrite:         transport.agent.config.Run.Mode == console.AgentRunModeWrite,
	}
}

func (transport *Transport) toUsage(response acpsdk.PromptResponse) *acpsdk.Usage {
	if response.Usage != nil {
		return response.Usage
	}
	quota, ok := response.Meta["quota"].(map[string]any)
	if !ok {
		return nil
	}

	tokenCount, ok := quota["token_count"].(map[string]any)
	if !ok {
		return nil
	}

	input, ok := transport.toTokenCount(tokenCount["input_tokens"])
	if !ok {
		return nil
	}

	output, ok := transport.toTokenCount(tokenCount["output_tokens"])
	if !ok || input > int(^uint(0)>>1)-output {
		return nil
	}

	return &acpsdk.Usage{InputTokens: input, OutputTokens: output, TotalTokens: input + output}
}

func (transport *Transport) toTokenCount(value any) (int, bool) {
	tokens, ok := value.(float64)
	limit := math.Ldexp(1, strconv.IntSize-1)

	if !ok || math.IsNaN(tokens) || math.IsInf(tokens, 0) || tokens < 0 || tokens >= limit || math.Trunc(tokens) != tokens {
		return 0, false
	}

	return int(tokens), true
}

func (transport *Transport) Turn(ctx context.Context, request toolv1.TurnRequest, sink toolv1.TurnSink) (toolv1.TurnResult, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	if err := ctx.Err(); err != nil {
		return toolv1.TurnResult{SessionID: request.SessionID}, err
	}
	if err := transport.agent.validateMode(request.Settings.Mode); err != nil {
		return toolv1.TurnResult{SessionID: request.SessionID}, err
	}

	process, err := transport.launch(request.Options, request.Settings.Mode, request.Settings.Model.Name)
	if err != nil {
		return toolv1.TurnResult{SessionID: request.SessionID}, err
	}

	result, err := transport.engine.Turn(ctx, process, transport.acpRequest(request), sink)
	return toolv1.TurnResult{SessionID: result.SessionID}, err
}

func (transport *Transport) acpRequest(request toolv1.TurnRequest) acp.Request {
	return acp.Request{
		Cwd:             transport.workDir,
		Prompt:          request.Prompt,
		Settings:        acp.SessionSettings{ModelID: request.Settings.Model.Name},
		FileSystemWrite: transport.Capabilities().FileSystemWrite,
	}
}

func (transport *Transport) launch(options []exec.Option, mode console.AgentRunMode, model string) (*exec.StdioProcess, error) {
	config := transport.agent.config
	gemini, err := transport.agent.runConfig(config.Run)
	if err != nil {
		return nil, err
	}

	args := []string{geminiACPFlag, geminiModelFlag, model}
	if mode == console.AgentRunModeWrite {
		args = append(args, geminiApprovalModeFlag)
	}

	launchOptions := append([]exec.Option(nil), options...)
	launchOptions = append(launchOptions,
		exec.WithArgs(args),
		exec.WithEnv(transport.agent.env(config)),
		exec.WithDir(transport.workDir),
		exec.WithTimeout(gemini.Timeout),
	)

	return exec.StartWithStdio(context.Background(), geminiBinary, launchOptions...)
}

func (agent *Agent) env(config toolv1.Config) []string {
	gemini := config.Run.Runtime.Config.Gemini
	env := []string{
		fmt.Sprintf("%s=%s", geminiAPIKeyEnv, gemini.APIKey),
		fmt.Sprintf("%s=%s", geminiTrustWorkspaceEnv, geminiTrustWorkspace),
		fmt.Sprintf("%s=%s", geminiHomeEnv, config.WorkDir),
	}

	if gemini.Endpoint != nil {
		env = append(env, fmt.Sprintf("%s=%s", geminiAPIBaseURLEnv, *gemini.Endpoint))
	}

	return env
}
