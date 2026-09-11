package gemini

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"strings"

	console "github.com/pluralsh/console/go/client"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
)

const (
	geminiBinary            = "gemini"
	geminiOutputFormatFlag  = "--output-format"
	geminiStreamJSONFormat  = "stream-json"
	geminiModelFlag         = "--model"
	geminiApprovalModeFlag  = "--approval-mode"
	geminiApprovalModeYolo  = "yolo"
	geminiResumeFlag        = "--resume"
	geminiPromptFlag        = "--prompt"
	geminiAPIKeyEnv         = "GEMINI_API_KEY"
	geminiAPIBaseURLEnv     = "GEMINI_API_BASE_URL"
	geminiGoogleBaseURLEnv  = "GOOGLE_GEMINI_BASE_URL"
	geminiTrustWorkspaceEnv = "GEMINI_CLI_TRUST_WORKSPACE"
	geminiHomeEnv           = "GEMINI_CLI_HOME"
	geminiTrustWorkspace    = "true"
	gitConfigCountEnv       = "GIT_CONFIG_COUNT"
	gitConfigKeyEnv         = "GIT_CONFIG_KEY_0"
	gitConfigValueEnv       = "GIT_CONFIG_VALUE_0"
	gitConfigCount          = "1"
	gitSafeDirectoryKey     = "safe.directory"
)

type Transport struct {
	agent         *Agent
	repositoryDir string
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
	repositoryDir, err := filepath.Abs(config.RepositoryDir)
	if err != nil {
		return nil, fmt.Errorf("resolve gemini repository directory: %w", err)
	}

	return &Transport{agent: agent, repositoryDir: repositoryDir}, nil
}

func (*Transport) Kind() toolv1.TransportKind {
	return toolv1.TransportKindRaw
}

func (transport *Transport) Capabilities() toolv1.TransportCapabilities {
	return toolv1.TransportCapabilities{
		SessionResume:           true,
		ToolCallOutputStreaming: false,
		UsageReporting:          true,
		FileSystemRead:          true,
		FileSystemWrite:         transport.agent.config.Run.Mode == console.AgentRunModeWrite,
	}
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

	executable, err := transport.executable(request)
	if err != nil {
		return toolv1.TurnResult{SessionID: request.SessionID}, err
	}

	turn := newStreamTurn(request.SessionID, sink)
	runErr := executable.RunStream(ctx, turn.consume)
	return toolv1.TurnResult{SessionID: turn.sessionID}, errors.Join(runErr, turn.err)
}

func (transport *Transport) executable(request toolv1.TurnRequest) (exec.Executable, error) {
	config := transport.agent.config
	gemini, err := transport.agent.runConfig(config.Run)
	if err != nil {
		return nil, err
	}

	launchOptions := append([]exec.Option(nil), request.Options...)
	launchOptions = append(
		launchOptions,
		exec.WithArgs(transport.args(request)),
		exec.WithEnv(transport.env(config)),
		exec.WithDir(transport.repositoryDir),
		exec.WithTimeout(gemini.Timeout),
	)

	return exec.NewExecutable(geminiBinary, launchOptions...), nil
}

func (transport *Transport) env(config toolv1.Config) []string {
	return append(transport.agent.env(config),
		fmt.Sprintf("%s=%s", gitConfigCountEnv, gitConfigCount),
		fmt.Sprintf("%s=%s", gitConfigKeyEnv, gitSafeDirectoryKey),
		fmt.Sprintf("%s=%s", gitConfigValueEnv, transport.repositoryDir),
	)
}

func (transport *Transport) args(request toolv1.TurnRequest) []string {
	model := transport.agent.resolveModel(request.Settings.Model.Name)
	args := []string{
		geminiOutputFormatFlag,
		geminiStreamJSONFormat,
		geminiModelFlag,
		model,
	}
	if request.Settings.Mode == console.AgentRunModeWrite {
		args = append(args, geminiApprovalModeFlag, geminiApprovalModeYolo)
	}
	if request.Kind != toolv1.TurnKindInitial && request.SessionID != "" {
		args = append(args, geminiResumeFlag, request.SessionID)
	}
	return append(args, geminiPromptFlag, request.Prompt)
}

func (agent *Agent) env(config toolv1.Config) []string {
	gemini := config.Run.Runtime.Config.Gemini
	apiKey := gemini.APIKey
	env := []string{
		fmt.Sprintf("%s=%s", geminiAPIKeyEnv, apiKey),
		fmt.Sprintf("%s=%s", geminiTrustWorkspaceEnv, geminiTrustWorkspace),
		fmt.Sprintf("%s=%s", geminiHomeEnv, config.WorkDir),
	}

	if config.Run.IsProxyEnabled() {
		apiKey = agent.consoleToken
		env[0] = fmt.Sprintf("%s=%s", geminiAPIKeyEnv, apiKey)
		if baseURL := agent.proxyBaseURL(); baseURL != "" {
			env = append(env, fmt.Sprintf("%s=%s", geminiGoogleBaseURLEnv, baseURL))
		}
		return env
	}

	if gemini.Endpoint != nil {
		env = append(env, fmt.Sprintf("%s=%s", geminiAPIBaseURLEnv, *gemini.Endpoint))
	}

	return env
}

func (agent *Agent) proxyBaseURL() string {
	consoleURL := strings.TrimSuffix(agent.consoleURL, "/")
	consoleURL = strings.TrimSuffix(consoleURL, "/ext/gql")
	consoleURL = strings.TrimSuffix(consoleURL, "/gql")
	consoleURL = strings.TrimSuffix(consoleURL, "/")
	if consoleURL == "" {
		return ""
	}
	return consoleURL + "/ext/ai/gemini"
}
