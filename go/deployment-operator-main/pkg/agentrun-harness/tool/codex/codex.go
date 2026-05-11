package codex

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path"
	"strings"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/deployment-operator/pkg/common"
	"github.com/pluralsh/deployment-operator/pkg/log"
	"github.com/samber/lo"
	"k8s.io/klog/v2"

	v1 "github.com/pluralsh/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/deployment-operator/pkg/harness/exec"
)

const (
	consoleTokenEnv   = "PLRL_CONSOLE_TOKEN"
	gitAccessTokenEnv = "GIT_ACCESS_TOKEN"
	gitAskpassPath    = "/plural/.git-askpass"
	gitSigningKeyPath = common.GitSigningKeyMountPath
)

func New(config v1.Config) v1.Tool {
	result := &Codex{
		DefaultTool: v1.DefaultTool{Config: config},
		apiKey:      config.Run.Runtime.Config.Codex.ApiKey,
		model:       EnsureModel(config.Run.Runtime.Config.Codex.Model),
		proxy:       config.Run.IsProxyEnabled(),
	}

	if config.Run.PluralCreds != nil {
		result.consoleToken = lo.FromPtr(config.Run.PluralCreds.Token)
	}

	if err := result.ensure(); err != nil {
		klog.Fatalf("failed to initialize codex tool: %v", err)
	}

	return result
}

func (in *Codex) ensure() error {
	if len(in.Config.WorkDir) == 0 {
		return fmt.Errorf("work directory is not set")
	}

	if len(in.Config.RepositoryDir) == 0 {
		return fmt.Errorf("repository directory is not set")
	}

	if !in.proxy && len(in.apiKey) == 0 {
		return fmt.Errorf("codex API key is not set")
	}
	return nil
}

func (in *Codex) Run(ctx context.Context, options ...exec.Option) {
	go in.start(ctx, options...)
}

func (in *Codex) ConfigureBabysitRun() error {
	klog.Info("configuring codex babysit run")
	return in.ConfigureSystemPromptForBabysitRun(console.AgentRuntimeTypeCodex)
}

func (in *Codex) Configure(consoleURL, consoleToken, deployToken string) error {
	if err := in.ConfigureSystemPrompt(console.AgentRuntimeTypeCodex); err != nil {
		return err
	}

	allowedEnvVars := []string{"PATH", "HOME", gitAccessTokenEnv}
	if _, err := os.Stat(gitSigningKeyPath); err == nil {
		allowedEnvVars = append(allowedEnvVars, "GIT_SIGNING_KEY_PATH")
	}

	baseAgent := AgentInput{
		Model:                string(in.model),
		ApprovalPolicy:       "never",
		ModelReasoningEffort: "medium",
		AllowedEnvVars:       allowedEnvVars,
		EnableWebSearch:      true,
		EnableShellCache:     true,
	}

	// The plural proxy requires models in "provider/model" format.
	if in.proxy {
		baseAgent.Model = "openai/" + baseAgent.Model
	}

	var (
		agents    []AgentInput
		mcps      []MCPInput
		providers []ModelProviderInput
	)

	modelProvider := ""
	if in.proxy {
		modelProvider = "plural"
		providers = []ModelProviderInput{{
			Name:    "plural",
			BaseURL: fmt.Sprintf("%s/ext/ai/v1", consoleURL),
			EnvKey:  consoleTokenEnv,
		}}
	} else if in.Config.Run.Runtime.Config.Codex.Endpoint != nil {
		modelProvider = "custom"
		providers = []ModelProviderInput{{
			Name:    "custom",
			BaseURL: *in.Config.Run.Runtime.Config.Codex.Endpoint,
			EnvKey:  "OPENAI_API_KEY",
		}}
	}

	mcpBaseEnv := map[string]string{
		consoleTokenEnv:       consoleToken,
		"PLRL_CONSOLE_URL":    consoleURL,
		"PLRL_AGENT_RUN_ID":   in.Config.Run.ID,
		gitAccessTokenEnv:     os.Getenv(gitAccessTokenEnv),
		"GIT_ASKPASS":         gitAskpassPath,
		"GIT_TERMINAL_PROMPT": "0",
	}

	switch in.Config.Run.Mode {
	case console.AgentRunModeAnalyze:
		agents = []AgentInput{{
			Name:                 "analysis",
			SandboxMode:          "read-only",
			Model:                baseAgent.Model,
			ApprovalPolicy:       baseAgent.ApprovalPolicy,
			ModelReasoningEffort: baseAgent.ModelReasoningEffort,
			AllowedEnvVars:       baseAgent.AllowedEnvVars,
			ModelProvider:        modelProvider,
		}}
		mcps = []MCPInput{{
			Name:         "plural",
			Type:         "stdio",
			Command:      "/usr/local/bin/mcpserver",
			TrustPolicy:  "always",
			EnabledTools: []string{"updateAgentRunAnalysis"},
			Env:          mcpBaseEnv,
		}}
	case console.AgentRunModeWrite:
		agents = []AgentInput{{
			Name:                 "autonomous",
			SandboxMode:          "workspace-write",
			Model:                baseAgent.Model,
			ApprovalPolicy:       baseAgent.ApprovalPolicy,
			ModelReasoningEffort: baseAgent.ModelReasoningEffort,
			AllowedEnvVars:       baseAgent.AllowedEnvVars,
			ModelProvider:        modelProvider,
		}}
		mcps = []MCPInput{{
			Name:         "plural",
			Type:         "stdio",
			Command:      "/usr/local/bin/mcpserver",
			TrustPolicy:  "always",
			EnabledTools: []string{"agentPullRequest", "createBranch", "fetchAgentRunTodos", "updateAgentRunTodos", "getPRState", "getCILogs", "reactToComment", "createCommit"},
			Env:          mcpBaseEnv,
		}}
	default:
		return fmt.Errorf("unsupported agent run mode %q for codex", in.Config.Run.Mode)
	}

	for _, cfg := range in.Config.Run.Runtime.ExaMcpConfigs {
		mcp := MCPInput{
			Name:        cfg.Name,
			Type:        "http",
			URL:         cfg.Url,
			TrustPolicy: "always",
		}
		if cfg.ApiKey != nil {
			mcp.Headers = map[string]string{"x-api-key": *cfg.ApiKey}
		}
		mcps = append(mcps, mcp)
	}

	cfg, err := BuildCodexConfig(in.Config.WorkDir, agents, mcps, providers)
	if err != nil {
		return err
	}

	// Trust the git signing key directory so codex can read the mounted key.
	if _, err := os.Stat(gitSigningKeyPath); err == nil {
		gitDir := path.Dir(gitSigningKeyPath)
		if cfg.Projects == nil {
			cfg.Projects = make(map[string]*Project)
		}
		cfg.Projects[gitDir] = &Project{TrustLevel: "trusted"}
	}

	config, err := WriteCodexConfig(path.Join(in.Config.WorkDir, ".codex"), cfg)
	if err != nil {
		return err
	}

	klog.InfoS("Codex configured", "configPath", config)

	return nil
}

func (in *Codex) OnMessage(f func(message *console.AgentMessageAttributes)) {
	in.onMessage = f
}

func (in *Codex) BabysitRun(ctx context.Context, bCtx *v1.BabysitContext) bool {
	klog.V(log.LogLevelInfo).InfoS("starting codex babysit run", "agent_run_id", in.Config.Run.ID)
	if bCtx == nil {
		return false
	}

	agent := "autonomous"
	args := []string{"exec", "--profile", agent, "--skip-git-repo-check", "--json", bCtx.Prompt}

	in.executable = exec.NewExecutable(
		"codex",
		exec.WithArgs(args),
		exec.WithDir(in.Config.WorkDir),
		exec.WithEnv([]string{fmt.Sprintf("PLRL_CONSOLE_TOKEN=%s", in.consoleToken), fmt.Sprintf("CODEX_HOME=%s", path.Join(in.Config.WorkDir, ".codex"))}),
		exec.WithTimeout(in.Config.Run.Runtime.Config.Codex.Timeout),
	)

	klog.V(log.LogLevelInfo).InfoS("codex executable configured", "timeout", in.Config.Run.Runtime.Config.Codex.Timeout)

	// Send the initial prompt as a message too
	if in.onMessage != nil {
		in.onMessage(&console.AgentMessageAttributes{Message: bCtx.Prompt, Role: console.AiRoleUser})
	}

	err := in.executable.RunStream(ctx, func(line []byte) {
		event := &StreamEvent{}
		if err := json.Unmarshal(line, event); err != nil {
			klog.V(log.LogLevelExtended).InfoS("failed to unmarshal codex stream event", "line", string(line))
			return
		}

		if event.Type == "thread.started" && event.ThreadID != "" {
			in.threadID = event.ThreadID
			klog.V(log.LogLevelDebug).InfoS("codex thread started", "thread_id", in.threadID)
		}

		msg := mapCodexStreamEventToAgentMessage(event, in.threadID)
		if in.onMessage != nil && msg != nil {
			in.onMessage(msg)
		}
	})
	if err != nil {
		klog.ErrorS(err, "codex execution failed")
		in.Config.ErrorChan <- err
		return false
	}

	klog.V(log.LogLevelExtended).InfoS("codex babysit run finished")
	return false
}

func (in *Codex) start(ctx context.Context, options ...exec.Option) {
	// In proxy mode the plural provider handles auth via PLRL_CONSOLE_TOKEN;
	// codex login is only needed for direct OpenAI usage.
	if !in.proxy && in.Config.Run.Runtime.Config.Codex.Endpoint == nil {
		loginArgs := []string{"-c", "printenv OPENAI_API_KEY | codex login --with-api-key"}
		in.executable = exec.NewExecutable(
			"bash",
			exec.WithArgs(loginArgs),
			exec.WithDir(in.Config.WorkDir),
			exec.WithEnv([]string{fmt.Sprintf("OPENAI_API_KEY=%s", in.apiKey), fmt.Sprintf("CODEX_HOME=%s", path.Join(in.Config.WorkDir, ".codex"))}),
			exec.WithTimeout(in.Config.Run.Runtime.Config.Codex.Timeout),
		)
		if err := in.executable.Run(ctx); err != nil {
			klog.ErrorS(err, "codex login failed")
			in.Config.ErrorChan <- err
			return
		}
	}

	agent := "analysis"
	if in.Config.Run.Mode == console.AgentRunModeWrite {
		agent = "autonomous"
	}

	args := []string{"exec", "--profile", agent, "--skip-git-repo-check", "--json", in.Config.Run.Prompt}

	in.executable = exec.NewExecutable(
		"codex",
		append(
			options,
			exec.WithArgs(args),
			exec.WithDir(in.Config.WorkDir),
			exec.WithEnv([]string{fmt.Sprintf("PLRL_CONSOLE_TOKEN=%s", in.consoleToken), fmt.Sprintf("CODEX_HOME=%s", path.Join(in.Config.WorkDir, ".codex"))}),
			exec.WithTimeout(in.Config.Run.Runtime.Config.Codex.Timeout),
		)...,
	)

	klog.V(log.LogLevelInfo).InfoS("codex executable configured", "timeout", in.Config.Run.Runtime.Config.Codex.Timeout)

	// Send the initial prompt as a message too
	if in.onMessage != nil {
		in.onMessage(&console.AgentMessageAttributes{Message: in.Config.Run.Prompt, Role: console.AiRoleUser})
	}

	err := in.executable.RunStream(ctx, func(line []byte) {
		event := &StreamEvent{}
		if err := json.Unmarshal(line, event); err != nil {
			klog.V(log.LogLevelExtended).InfoS("failed to unmarshal codex stream event", "line", string(line))
			return
		}

		if event.Type == "thread.started" && event.ThreadID != "" {
			in.threadID = event.ThreadID
			klog.V(log.LogLevelDebug).InfoS("codex thread started", "thread_id", in.threadID)
		}

		msg := mapCodexStreamEventToAgentMessage(event, in.threadID)
		if in.onMessage != nil && msg != nil {
			in.onMessage(msg)
		}
	})
	if err != nil {
		klog.ErrorS(err, "codex execution failed")
		in.Config.ErrorChan <- err
		return
	}
	klog.V(log.LogLevelExtended).InfoS("codex execution finished")
	// FinishedChan is closed by the controller after the babysit loop exits.
}

// mapCodexStreamEventToAgentMessage converts a single Codex CLI JSON stream event into an
// AgentMessageAttributes to be forwarded to the API.
func mapCodexStreamEventToAgentMessage(event *StreamEvent, threadID string) *console.AgentMessageAttributes {
	switch event.Type {
	case "item.completed":
		if event.Item == nil {
			return nil
		}
		return mapStreamItem(event.Item, threadID)
	case "turn.completed":
		if event.Usage == nil {
			return nil
		}
		totalTokens := float64(event.Usage.InputTokens + event.Usage.OutputTokens)
		return &console.AgentMessageAttributes{
			Role:    console.AiRoleAssistant,
			Message: "turn.completed",
			Cost: &console.AgentMessageCostAttributes{
				Total: totalTokens,
				Tokens: &console.AgentMessageTokensAttributes{
					Input:  lo.ToPtr(float64(event.Usage.InputTokens)),
					Output: lo.ToPtr(float64(event.Usage.OutputTokens)),
				},
			},
		}
	}
	return nil
}

// mapStreamItem maps a completed StreamItem to an AgentMessageAttributes.
func mapStreamItem(item *StreamItem, threadID string) *console.AgentMessageAttributes {
	switch item.Type {
	case "reasoning":
		if item.Text == "" {
			return nil
		}
		klog.V(log.LogLevelDebug).InfoS("codex reasoning", "text", item.Text, "thread_id", threadID)
		return &console.AgentMessageAttributes{
			Role:    console.AiRoleAssistant,
			Message: item.Text,
		}

	case "agent_message":
		if item.Text == "" {
			return nil
		}
		klog.V(log.LogLevelDebug).InfoS("codex agent message", "text", item.Text, "thread_id", threadID)
		return &console.AgentMessageAttributes{
			Role:    console.AiRoleAssistant,
			Message: item.Text,
		}

	case "command_execution":
		if item.Status != statusCompleted && item.Status != statusFailed {
			return nil
		}
		exitCode := 0
		if item.ExitCode != nil {
			exitCode = *item.ExitCode
		}
		state := console.AgentMessageToolStateCompleted
		if item.Status == statusFailed || exitCode != 0 {
			state = console.AgentMessageToolStateError
		}
		klog.V(log.LogLevelDebug).InfoS("codex command execution", "command", item.Command, "exit_code", exitCode, "thread_id", threadID)
		return &console.AgentMessageAttributes{
			Role:    console.AiRoleAssistant,
			Message: "Called tool",
			Metadata: &console.AgentMessageMetadataAttributes{
				Tool: &console.AgentMessageToolAttributes{
					Name:   lo.ToPtr(item.Command),
					State:  lo.ToPtr(state),
					Output: lo.ToPtr(item.AggregatedOutput),
				},
			},
		}

	case "mcp_tool_call":
		if item.Status != statusCompleted && item.Status != statusFailed {
			return nil
		}
		state := console.AgentMessageToolStateCompleted
		errMsg := ""
		if item.Status == statusFailed {
			state = console.AgentMessageToolStateError
			if item.Error != nil {
				errMsg = item.Error.Message
			}
		}
		toolName := fmt.Sprintf("%s/%s", item.Server, item.Tool)
		output := errMsg
		if output == "" && item.Result != nil {
			output = string(item.Result)
		}
		klog.V(log.LogLevelDebug).InfoS("codex mcp tool call", "server", item.Server, "tool", item.Tool, "status", item.Status, "thread_id", threadID)
		return &console.AgentMessageAttributes{
			Role:    console.AiRoleAssistant,
			Message: "Called tool",
			Metadata: &console.AgentMessageMetadataAttributes{
				Tool: &console.AgentMessageToolAttributes{
					Name:   lo.ToPtr(toolName),
					State:  lo.ToPtr(state),
					Output: lo.ToPtr(output),
				},
			},
		}

	case "file_change":
		if item.Status != statusCompleted && item.Status != statusFailed {
			return nil
		}
		state := console.AgentMessageToolStateCompleted
		if item.Status == statusFailed {
			state = console.AgentMessageToolStateError
		}
		paths := make([]string, 0, len(item.Changes))
		for _, c := range item.Changes {
			paths = append(paths, fmt.Sprintf("%s:%s", c.Kind, c.Path))
		}
		output := strings.Join(paths, ", ")
		klog.V(log.LogLevelDebug).InfoS("codex file change", "changes", output, "thread_id", threadID)
		return &console.AgentMessageAttributes{
			Role:    console.AiRoleAssistant,
			Message: "File changes applied",
			Metadata: &console.AgentMessageMetadataAttributes{
				Tool: &console.AgentMessageToolAttributes{
					Name:   lo.ToPtr("file_change"),
					State:  lo.ToPtr(state),
					Output: lo.ToPtr(output),
				},
			},
		}
	}

	return nil
}
