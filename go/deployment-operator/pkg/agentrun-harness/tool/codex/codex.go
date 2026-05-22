package codex

import (
	"context"
	"fmt"
	"path"

	"github.com/samber/lo"
	"k8s.io/klog/v2"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/environment"
	proxymodel "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/model"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"

	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
)

func New(config v1.Config) v1.Tool {
	result := &Codex{
		DefaultTool: v1.DefaultTool{Config: config},
		apiKey:      config.Run.Runtime.Config.Codex.ApiKey,
		model:       EnsureModel(config.Run.Runtime.Config.Codex.Model),
		proxy:       config.Run.IsProxyEnabled(),
		toolItems:   make(map[string]*StreamItem),
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

	return nil
}

func (in *Codex) Run(ctx context.Context, options ...exec.Option) {
	go in.start(ctx, options...)
}

func (in *Codex) ConfigureBabysitRun() error {
	klog.Info("configuring codex babysit run")
	return in.ConfigureSystemPromptForBabysitRun(console.AgentRuntimeTypeCodex)
}

func (in *Codex) Configure(consoleURL, _ string) error {
	if err := in.ConfigureSystemPrompt(console.AgentRuntimeTypeCodex); err != nil {
		return err
	}

	allowedEnvVars := []string{"PATH", "HOME"}
	model := string(in.model)
	if in.proxy {
		model = proxymodel.ProxyModel(console.AgentRuntimeTypeCodex, model)
	}

	baseAgent := AgentInput{
		Model:                model,
		ApprovalPolicy:       "never",
		ModelReasoningEffort: "medium",
		AllowedEnvVars:       allowedEnvVars,
		EnableWebSearch:      true,
		EnableShellCache:     true,
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
			EnvKey:  environment.EnvConsoleToken,
		}}
	} else if in.Config.Run.Runtime.Config.Codex.Endpoint != nil {
		modelProvider = "custom"
		providers = []ModelProviderInput{{
			Name:    "custom",
			BaseURL: *in.Config.Run.Runtime.Config.Codex.Endpoint,
			EnvKey:  "OPENAI_API_KEY",
		}}
	}

	mcps = []MCPInput{{
		Name:        "plural",
		Type:        "http",
		URL:         common.AgentMCPServerURL,
		TrustPolicy: "always",
	}}

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

	cfg, err := BuildCodexConfig(in.Config.RepositoryDir, agents, mcps, providers)
	if err != nil {
		return err
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
	if bCtx == nil {
		return false
	}

	klog.V(log.LogLevelInfo).InfoS("starting codex babysit run", "agent_run_id", in.Config.Run.ID)

	agent := "autonomous"
	args := []string{"exec", "--profile", agent, "--json", bCtx.Prompt}

	in.executable = exec.NewExecutable(
		"codex",
		append(in.codexExecOptions(), exec.WithArgs(args))...,
	)

	klog.V(log.LogLevelInfo).InfoS("codex executable configured", "timeout", in.Config.Run.Runtime.Config.Codex.Timeout)

	// Send the initial prompt as a message too
	if in.onMessage != nil {
		in.onMessage(&console.AgentMessageAttributes{Message: bCtx.Prompt, Role: console.AiRoleUser})
	}

	in.resetToolItems()
	err := in.executable.RunStream(ctx, in.handleStreamLine)
	if err != nil {
		klog.ErrorS(err, "codex execution failed")
		in.Config.ErrorChan <- err
		return false
	}

	klog.V(log.LogLevelExtended).InfoS("codex babysit run finished")
	return false
}

// AnalysisFollowUpRun re-runs Codex with the analysis profile and
// followUpPrompt. Errors are returned to the caller and must not be sent on
// ErrorChan.
func (in *Codex) AnalysisFollowUpRun(ctx context.Context, followUpPrompt string) error {
	if in.Config.Run.Mode != console.AgentRunModeAnalyze {
		return nil
	}

	klog.V(log.LogLevelInfo).InfoS("analysis follow-up: reprompting codex", "prompt_len", len(followUpPrompt))

	if in.onMessage != nil {
		in.onMessage(&console.AgentMessageAttributes{Message: followUpPrompt, Role: console.AiRoleUser})
	}

	args := []string{"exec", "--profile", "analysis", "--json", followUpPrompt}

	in.executable = exec.NewExecutable(
		"codex",
		append(in.codexExecOptions(), exec.WithArgs(args))...,
	)

	in.resetToolItems()
	err := in.executable.RunStream(ctx, in.handleStreamLine)
	if err != nil {
		return fmt.Errorf("codex analysis follow-up execution failed: %w", err)
	}
	klog.V(log.LogLevelExtended).InfoS("codex analysis follow-up execution finished")
	return nil
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

	args := []string{"exec", "--profile", agent, "--json", in.Config.Run.Prompt}

	in.executable = exec.NewExecutable(
		"codex",
		append(
			options,
			append(in.codexExecOptions(), exec.WithArgs(args))...,
		)...,
	)

	klog.V(log.LogLevelInfo).InfoS("codex executable configured", "timeout", in.Config.Run.Runtime.Config.Codex.Timeout)

	// Send the initial prompt as a message too
	if in.onMessage != nil {
		in.onMessage(&console.AgentMessageAttributes{Message: in.Config.Run.Prompt, Role: console.AiRoleUser})
	}

	in.resetToolItems()
	err := in.executable.RunStream(ctx, in.handleStreamLine)
	if err != nil {
		klog.ErrorS(err, "codex execution failed")
		in.Config.ErrorChan <- err
		return
	}
	klog.V(log.LogLevelExtended).InfoS("codex execution finished")
	// FinishedChan is closed by the controller after the babysit loop exits.
}

func (in *Codex) codexExecOptions() []exec.Option {
	return []exec.Option{
		exec.WithDir(in.Config.RepositoryDir),
		exec.WithEnv([]string{
			fmt.Sprintf("PLRL_CONSOLE_TOKEN=%s", in.consoleToken),
			fmt.Sprintf("CODEX_HOME=%s", path.Join(in.Config.WorkDir, ".codex")),
		}),
		exec.WithTimeout(in.Config.Run.Runtime.Config.Codex.Timeout),
	}
}
