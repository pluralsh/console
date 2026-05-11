package claude

import (
	"context"
	"encoding/json"
	"fmt"
	"path"
	"path/filepath"
	"strings"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	"k8s.io/klog/v2"

	v1 "github.com/pluralsh/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/deployment-operator/pkg/harness/exec"
	"github.com/pluralsh/deployment-operator/pkg/log"
)

func New(config v1.Config) v1.Tool {
	result := &Claude{
		DefaultTool:  v1.DefaultTool{Config: config},
		token:        config.Run.Runtime.Config.Claude.ApiKey,
		model:        EnsureModel(config.Run.Runtime.Config.Claude.Model),
		toolUseCache: make(map[string]ContentMsg),
	}

	if err := result.ensure(); err != nil {
		klog.Fatalf("failed to initialize claude tool: %v", err)
	}

	return result
}

func (in *Claude) Run(ctx context.Context, options ...exec.Option) {
	go in.start(ctx, options...)
}

// BabysitRun re-invokes the Claude CLI with the reprompt from bCtx.
// If bCtx is nil (PR state unchanged) it returns false to keep the babysit loop running.
// Returns true only on a fatal error that should stop the loop.
func (in *Claude) BabysitRun(ctx context.Context, bCtx *v1.BabysitContext) bool {
	if bCtx == nil {
		return false
	}

	klog.V(log.LogLevelInfo).InfoS("babysit: PR state changed, reprompting claude", "prompt_len", len(bCtx.Prompt))

	// Emit the reprompt as a user message so it appears in the Console conversation log.
	if in.onMessage != nil {
		in.onMessage(&console.AgentMessageAttributes{
			Message: bCtx.Prompt,
			Role:    console.AiRoleUser,
		})
	}

	// Re-run the Claude CLI synchronously with the reprompt.
	// We reuse the same configuration but swap the -p argument.
	promptFile := path.Join(in.Config.WorkDir, ".claude", "prompts", v1.SystemPromptFile)
	agent := babysitAgent

	args := []string{
		"--add-dir", in.Config.RepositoryDir,
		"--agents", agent,
		"--system-prompt-file", promptFile,
		"--model", string(in.model),
		"-p", bCtx.Prompt,
		"--output-format", "stream-json",
		"--verbose",
	}

	var envOpt exec.Option
	if in.Config.Run.IsProxyEnabled() {
		envOpt = exec.WithEnv([]string{
			fmt.Sprintf("ANTHROPIC_AUTH_TOKEN=%s", in.consoleToken),
			fmt.Sprintf("ANTHROPIC_BASE_URL=%s", fmt.Sprintf("%s/ext/ai/anthropic", in.consoleURL)),
		})
	} else {
		env := []string{fmt.Sprintf("ANTHROPIC_API_KEY=%s", in.token)}
		if in.Config.Run.Runtime.Config.Claude.Endpoint != nil {
			env = append(env, fmt.Sprintf("ANTHROPIC_BASE_URL=%s", *in.Config.Run.Runtime.Config.Claude.Endpoint))
		}
		envOpt = exec.WithEnv(env)
	}

	in.executable = exec.NewExecutable(
		"claude",
		envOpt,
		exec.WithArgs(args),
		exec.WithDir(in.Config.WorkDir),
		exec.WithTimeout(in.Config.Run.Runtime.Config.Claude.Timeout),
	)

	err := in.executable.RunStream(ctx, func(line []byte) {
		event := &StreamEvent{}
		if err := json.Unmarshal(line, event); err != nil {
			klog.ErrorS(err, "failed to unmarshal claude babysit stream event", "line", string(line))
			return
		}
		if event.Message != nil {
			msg := mapClaudeContentToAgentMessage(event, in.toolUseCache)
			if in.onMessage != nil && msg != nil {
				in.onMessage(msg)
			}
		}
	})
	if err != nil {
		klog.ErrorS(err, "claude execution failed")
		in.Config.ErrorChan <- err
		return false
	}

	klog.V(log.LogLevelExtended).InfoS("claude babysit execution finished")
	return false
}

func (in *Claude) start(ctx context.Context, options ...exec.Option) {
	promptFile := path.Join(in.Config.WorkDir, ".claude", "prompts", v1.SystemPromptFile)
	agent := analysisAgent
	if in.Config.Run.Mode == console.AgentRunModeWrite {
		agent = autonomousAgent
	}
	args := []string{
		"--add-dir", in.Config.RepositoryDir,
		"--agents", agent,
		"--system-prompt-file", promptFile,
		"--model", string(in.model),
		"-p", in.Config.Run.Prompt,
		"--output-format", "stream-json",
		"--verbose"}

	if in.Config.Run.IsProxyEnabled() {
		options = append(options,
			exec.WithEnv([]string{
				fmt.Sprintf("ANTHROPIC_AUTH_TOKEN=%s", in.consoleToken),
				fmt.Sprintf("ANTHROPIC_BASE_URL=%s", fmt.Sprintf("%s/ext/ai/anthropic", in.consoleURL)),
			}),
		)
	} else {
		env := []string{fmt.Sprintf("ANTHROPIC_API_KEY=%s", in.token)}
		if in.Config.Run.Runtime.Config.Claude.Endpoint != nil {
			env = append(env, fmt.Sprintf("ANTHROPIC_BASE_URL=%s", *in.Config.Run.Runtime.Config.Claude.Endpoint))
		}
		options = append(options, exec.WithEnv(env))
	}

	in.executable = exec.NewExecutable(
		"claude",
		append(
			options,
			exec.WithArgs(args),
			exec.WithDir(in.Config.WorkDir),
			exec.WithTimeout(in.Config.Run.Runtime.Config.Claude.Timeout),
		)...,
	)
	klog.V(log.LogLevelInfo).InfoS("claude executable configured", "timeout", in.Config.Run.Runtime.Config.Claude.Timeout)

	// Send the initial prompt as a message too
	if in.onMessage != nil {
		in.onMessage(&console.AgentMessageAttributes{Message: in.Config.Run.Prompt, Role: console.AiRoleUser})
	}

	err := in.executable.RunStream(ctx, func(line []byte) {
		event := &StreamEvent{}
		if err := json.Unmarshal(line, event); err != nil {
			klog.ErrorS(err, "failed to unmarshal claude stream event", "line", string(line))
			in.Config.ErrorChan <- err
			return
		}

		if event.Message != nil {
			msg := mapClaudeContentToAgentMessage(event, in.toolUseCache)
			if in.onMessage != nil && msg != nil {
				in.onMessage(msg)
			}
		}
	})
	if err != nil {
		klog.ErrorS(err, "claude execution failed")
		in.Config.ErrorChan <- err
		return
	}
	klog.V(log.LogLevelExtended).InfoS("claude execution finished")
	// FinishedChan is closed by the controller after the babysit loop exits.
}

func (in *Claude) ConfigureBabysitRun() error {
	if err := in.ConfigureSystemPromptForBabysitRun(console.AgentRuntimeTypeClaude); err != nil {
		return err
	}

	settings := NewSettingsBuilder(in.model)
	settings.AllowTools(
		"Read",
		"Write",
		"Edit",
		"MultiEdit",
		"Bash",
		"WebFetch",
		"mcp__plural__createCommit",
		"mcp__plural__fetchAgentRunTodos",
		"mcp__plural__updateAgentRunTodos",
		"mcp__plural__getPRState",
		"mcp__plural__getCILogs",
		"mcp__plural__reactToComment")

	for _, cfg := range in.Config.Run.Runtime.ExaMcpConfigs {
		settings.AllowTools(fmt.Sprintf("mcp__%s__*", cfg.Name))
	}
	defaultTimeout := fmt.Sprintf("%d", in.Config.Run.Runtime.Config.Claude.BashTimeout.Milliseconds())
	maxTimeout := fmt.Sprintf("%d", in.Config.Run.Runtime.Config.Claude.BashMaxTimeout.Milliseconds())
	settings.WithEnv("BASH_DEFAULT_TIMEOUT_MS", defaultTimeout)
	settings.WithEnv("BASH_MAX_TIMEOUT_MS", maxTimeout)
	klog.V(log.LogLevelInfo).InfoS("claude timeouts configured", "default_timeout", defaultTimeout, "max_timeout", maxTimeout)

	return settings.WriteToFile(filepath.Join(in.configPath(), "settings.local.json"))
}

func (in *Claude) Configure(consoleURL, consoleToken, _ string) error {
	if err := in.ConfigureSystemPrompt(console.AgentRuntimeTypeClaude); err != nil {
		return err
	}

	mcp := NewMCPConfigBuilder()
	mcp.
		AddServer("plural", "mcpserver").
		Env("PLRL_CONSOLE_TOKEN", consoleToken).
		Env("PLRL_CONSOLE_URL", consoleURL).
		Env("PLRL_AGENT_RUN_ID", in.Config.Run.ID).
		Done()

	if len(in.Config.Run.Runtime.ExaMcpConfigs) > 0 {
		for _, cfg := range in.Config.Run.Runtime.ExaMcpConfigs {
			sb := mcp.AddURLServer(cfg.Name, cfg.Url)
			if cfg.ApiKey != nil {
				sb.Header("x-api-key", *cfg.ApiKey)
			}
			sb.Done()
		}
	}

	if err := mcp.WriteToFile(filepath.Join(in.Config.WorkDir, ".mcp.json")); err != nil {
		return err
	}

	if in.Config.Run.IsProxyEnabled() {
		in.consoleToken = consoleToken
		in.consoleURL = consoleURL
	}

	settings := NewSettingsBuilder(in.model)
	if in.Config.Run.Mode == console.AgentRunModeAnalyze {
		settings.AllowTools(
			"Read",
			"Grep",
			"Glob",
			"Bash(ls:*)",
			"Bash(cd:*)",
			"Bash(pwd)",
			"Bash(git status)",
			"Bash(git diff:*)",
			"Bash(head:*)",
			"Bash(tail:*)",
			"Bash(cat:*)",
			"Bash(grep:*)",
			"Bash(find:*)",
			"WebFetch",
			"mcp__plural__updateAgentRunAnalysis").
			DenyTools("Edit", "Write", "Bash(rm:*)", "Bash(sudo:*)")
	} else {
		settings.AllowTools(
			"Read",
			"Write",
			"Edit",
			"MultiEdit",
			"Bash",
			"WebFetch",
			"mcp__plural__agentPullRequest",
			"mcp__plural__createBranch",
			"mcp__plural__fetchAgentRunTodos",
			"mcp__plural__updateAgentRunTodos")
	}

	for _, cfg := range in.Config.Run.Runtime.ExaMcpConfigs {
		settings.AllowTools(fmt.Sprintf("mcp__%s__*", cfg.Name))
	}

	defaultTimeout := fmt.Sprintf("%d", in.Config.Run.Runtime.Config.Claude.BashTimeout.Milliseconds())
	maxTimeout := fmt.Sprintf("%d", in.Config.Run.Runtime.Config.Claude.BashMaxTimeout.Milliseconds())
	settings.WithEnv("BASH_DEFAULT_TIMEOUT_MS", defaultTimeout)
	settings.WithEnv("BASH_MAX_TIMEOUT_MS", maxTimeout)
	klog.V(log.LogLevelInfo).InfoS("claude timeouts configured", "default_timeout", defaultTimeout, "max_timeout", maxTimeout)

	return settings.WriteToFile(filepath.Join(in.configPath(), "settings.local.json"))
}

func (in *Claude) configPath() string {
	return path.Join(in.Config.WorkDir, ".claude")
}

func (in *Claude) OnMessage(f func(message *console.AgentMessageAttributes)) {
	in.onMessage = f
}

func (in *Claude) ensure() error {
	if len(in.Config.WorkDir) == 0 {
		return fmt.Errorf("work directory is not set")
	}

	if len(in.Config.RepositoryDir) == 0 {
		return fmt.Errorf("repository directory is not set")
	}

	if len(in.Config.WorkDir) == 0 {
		return fmt.Errorf("agent run is not set")
	}

	return nil
}

func mapClaudeContentToAgentMessage(event *StreamEvent, toolUseCache map[string]ContentMsg) *console.AgentMessageAttributes {
	msg := &console.AgentMessageAttributes{
		Role: mapRole(event.Message.Role),
	}

	var builder strings.Builder
	for _, c := range event.Message.Content {
		klog.V(log.LogLevelExtended).InfoS("claude content", "type", c.Type, "text", c.Text)

		switch c.Type {
		case "tool_use":
			// Cache tool name for later use in tool_result
			if c.ID != "" {
				toolUseCache[c.ID] = c
			}
		case "tool_result":
			output := ""
			if c.Content != nil {
				switch o := c.Content.(type) {
				case string:
					output = o
				default:
					if outputJSON, err := json.Marshal(o); err == nil {
						output = string(outputJSON)
					}
				}
			}
			toolUseContent, exists := toolUseCache[c.ToolUseID]
			if !exists {
				toolUseContent.Name = c.ToolUseID
			}
			klog.V(log.LogLevelDebug).InfoS("claude tool result", "tool_use_id", c.ToolUseID, "name", toolUseContent.Name, "is_error", c.IsError, "output", output)

			state := console.AgentMessageToolStateCompleted
			if c.IsError {
				state = console.AgentMessageToolStateError
			}
			msg.Role = console.AiRoleAssistant // Agent run tool calls should be marked as assistant messages.
			msg.Metadata = &console.AgentMessageMetadataAttributes{
				Tool: &console.AgentMessageToolAttributes{
					Name:   lo.ToPtr(toolUseContent.Name),
					State:  lo.ToPtr(state),
					Output: lo.ToPtr(output),
				},
			}

			input, err := json.Marshal(toolUseContent.Input)
			if err == nil {
				msg.Metadata.Tool.Input = lo.ToPtr(string(input))
			}

			builder.WriteString("Called tool")
		case "text":
			builder.WriteString(c.Text)
		}
	}
	msg.Message = builder.String()

	// Empty messages are not valid
	if len(msg.Message) == 0 {
		return nil
	}

	// Map usage → Cost
	if event.Message.Usage != nil {
		total := float64(event.Message.Usage.InputTokens + event.Message.Usage.OutputTokens)
		input := float64(event.Message.Usage.InputTokens)
		output := float64(event.Message.Usage.OutputTokens)

		msg.Cost = &console.AgentMessageCostAttributes{
			Total: total,
			Tokens: &console.AgentMessageTokensAttributes{
				Input:  &input,
				Output: &output,
			},
		}
	}

	return msg
}

func mapRole(role string) console.AiRole {
	switch strings.ToLower(role) {
	case "assistant":
		return console.AiRoleAssistant
	case "system":
		return console.AiRoleSystem
	case "user":
		return console.AiRoleUser
	default:
		return console.AiRoleSystem // Default to system role for unknown roles.
	}
}
