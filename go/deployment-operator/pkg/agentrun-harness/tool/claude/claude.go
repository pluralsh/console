package claude

import (
	"context"
	"encoding/json"
	"fmt"
	"path"
	"path/filepath"
	"strings"

	"github.com/samber/lo"
	"k8s.io/klog/v2"

	console "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/mcp"
	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/usage"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
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
		}, "")
	}

	// promptFile is the absolute path to the rendered system prompt file.
	promptFile := path.Join(in.Config.WorkDir, ".claude", "prompts", v1.SystemPromptFile)
	agent := in.agentJSON(babysitAgent)

	args := claudeRunArgs(in.Config.RepositoryDir, promptFile, agent, in.model, bCtx.Prompt, in.sessionID)

	var envOpt exec.Option
	if in.Config.Run.IsProxyEnabled() {
		envOpt = exec.WithEnv(in.withConfigEnv([]string{
			fmt.Sprintf("ANTHROPIC_AUTH_TOKEN=%s", in.consoleToken),
			fmt.Sprintf("ANTHROPIC_BASE_URL=%s", fmt.Sprintf("%s/ext/ai/anthropic", in.consoleURL)),
		}))
	} else {
		env := []string{fmt.Sprintf("ANTHROPIC_API_KEY=%s", in.token)}
		if in.Config.Run.Runtime.Config.Claude.Endpoint != nil {
			env = append(env, fmt.Sprintf("ANTHROPIC_BASE_URL=%s", *in.Config.Run.Runtime.Config.Claude.Endpoint))
		}
		envOpt = exec.WithEnv(in.withConfigEnv(env))
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
		in.recordSessionID(event.SessionID)
		if event.Message != nil {
			emitClaudeContent(event, in.toolUseCache, in.Config.Usage, in.onMessage)
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

// FollowUpRun re-runs the Claude CLI with the same agent and system prompt as
// the initial run, swapping only the -p user prompt. Errors are returned to the
// caller and must not be sent on ErrorChan.
func (in *Claude) FollowUpRun(ctx context.Context, followUpPrompt string) error {
	klog.V(log.LogLevelInfo).InfoS(
		"follow-up: reprompting claude",
		"prompt_len", len(followUpPrompt),
		"resumeSession", in.sessionID != "",
		"sessionID", in.sessionID,
	)

	promptFile := path.Join(in.Config.WorkDir, ".claude", "prompts", v1.SystemPromptFile)
	agent := in.agentJSON(analysisAgent)
	switch in.Config.Run.Mode {
	case console.AgentRunModeWrite:
		agent = in.agentJSON(autonomousAgent)
	case console.AgentRunModeReview:
		agent = in.agentJSON(reviewAgent)
	}
	args := claudeRunArgs(in.Config.RepositoryDir, promptFile, agent, in.model, followUpPrompt, in.sessionID)

	var opts []exec.Option
	if in.Config.Run.IsProxyEnabled() {
		opts = append(opts, exec.WithEnv(in.withConfigEnv([]string{
			fmt.Sprintf("ANTHROPIC_AUTH_TOKEN=%s", in.consoleToken),
			fmt.Sprintf("ANTHROPIC_BASE_URL=%s", fmt.Sprintf("%s/ext/ai/anthropic", in.consoleURL)),
		})))
	} else {
		env := []string{fmt.Sprintf("ANTHROPIC_API_KEY=%s", in.token)}
		if in.Config.Run.Runtime.Config.Claude.Endpoint != nil {
			env = append(env, fmt.Sprintf("ANTHROPIC_BASE_URL=%s", *in.Config.Run.Runtime.Config.Claude.Endpoint))
		}
		opts = append(opts, exec.WithEnv(in.withConfigEnv(env)))
	}

	in.executable = exec.NewExecutable(
		"claude",
		append(
			opts,
			exec.WithArgs(args),
			exec.WithDir(in.Config.WorkDir),
			exec.WithTimeout(in.Config.Run.Runtime.Config.Claude.Timeout),
		)...,
	)

	err := in.executable.RunStream(ctx, func(line []byte) {
		event := &StreamEvent{}
		if err := json.Unmarshal(line, event); err != nil {
			klog.ErrorS(err, "failed to unmarshal claude stream event (follow-up)", "line", string(line))
			return
		}
		in.recordSessionID(event.SessionID)
		if event.Message != nil {
			emitClaudeContent(event, in.toolUseCache, in.Config.Usage, in.onMessage)
		}
	})
	if err != nil {
		return fmt.Errorf("claude follow-up execution failed: %w", err)
	}
	klog.V(log.LogLevelExtended).InfoS("claude follow-up execution finished")
	return nil
}

func (in *Claude) start(ctx context.Context, options ...exec.Option) {
	promptFile := path.Join(in.Config.WorkDir, ".claude", "prompts", v1.SystemPromptFile)
	agent := in.agentJSON(analysisAgent)
	switch in.Config.Run.Mode {
	case console.AgentRunModeWrite:
		agent = in.agentJSON(autonomousAgent)
	case console.AgentRunModeReview:
		agent = in.agentJSON(reviewAgent)
	}
	args := claudeRunArgs(in.Config.RepositoryDir, promptFile, agent, in.model, in.Config.Run.Prompt, "")

	if in.Config.Run.IsProxyEnabled() {
		options = append(options,
			exec.WithEnv(in.withConfigEnv([]string{
				fmt.Sprintf("ANTHROPIC_AUTH_TOKEN=%s", in.consoleToken),
				fmt.Sprintf("ANTHROPIC_BASE_URL=%s", fmt.Sprintf("%s/ext/ai/anthropic", in.consoleURL)),
			})),
		)
	} else {
		env := []string{fmt.Sprintf("ANTHROPIC_API_KEY=%s", in.token)}
		if in.Config.Run.Runtime.Config.Claude.Endpoint != nil {
			env = append(env, fmt.Sprintf("ANTHROPIC_BASE_URL=%s", *in.Config.Run.Runtime.Config.Claude.Endpoint))
		}
		options = append(options, exec.WithEnv(in.withConfigEnv(env)))
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
	klog.V(log.LogLevelInfo).InfoS("claude executable configured", "timeout", in.Config.Run.Runtime.Config.Claude.Timeout, "model", in.model)

	// Send the initial prompt as a message too
	if in.onMessage != nil {
		in.onMessage(&console.AgentMessageAttributes{Message: in.Config.Run.Prompt, Role: console.AiRoleUser}, "")
	}

	err := in.executable.RunStream(ctx, func(line []byte) {
		event := &StreamEvent{}
		if err := json.Unmarshal(line, event); err != nil {
			klog.ErrorS(err, "failed to unmarshal claude stream event", "line", string(line))
			in.Config.ErrorChan <- err
			return
		}
		in.recordSessionID(event.SessionID)

		if event.Message != nil {
			emitClaudeContent(event, in.toolUseCache, in.Config.Usage, in.onMessage)
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
	if err := in.ConfigureSkills(in.skillsPath()); err != nil {
		return err
	}

	settings := NewSettingsBuilder(in.model)
	external, err := mcp.Load()
	if err != nil {
		return err
	}
	settings.AllowTools(
		"Read",
		"Write",
		"Edit",
		"MultiEdit",
		"Bash",
		"WebFetch",
		PluralMCPToolsWildcard,
		CodebaseMemoryMCPToolsWildcard,
	).AllowTools(externalMCPAllowTools(external)...)
	defaultTimeout := fmt.Sprintf("%d", in.Config.Run.Runtime.Config.Claude.BashTimeout.Milliseconds())
	maxTimeout := fmt.Sprintf("%d", in.Config.Run.Runtime.Config.Claude.BashMaxTimeout.Milliseconds())
	settings.WithEnv("BASH_DEFAULT_TIMEOUT_MS", defaultTimeout)
	settings.WithEnv("BASH_MAX_TIMEOUT_MS", maxTimeout)
	klog.V(log.LogLevelInfo).InfoS("claude timeouts configured", "default_timeout", defaultTimeout, "max_timeout", maxTimeout)

	return settings.WriteToFile(filepath.Join(in.configPath(), "settings.local.json"))
}

func (in *Claude) Configure(consoleURL, consoleToken string) error {
	if err := in.ConfigureSystemPrompt(console.AgentRuntimeTypeClaude); err != nil {
		return err
	}
	if err := in.ConfigureSkills(in.skillsPath()); err != nil {
		return err
	}

	mcpCfg := NewMCPConfigBuilder()
	mcpCfg.
		AddURLServer("plural", common.AgentMCPServerURL).
		Done().
		AddServer(common.CodebaseMemoryMCPServerName, common.CodebaseMemoryMCPCommand).
		Env(common.CodebaseMemoryCacheEnv, common.CodebaseMemoryCacheDir).
		Done()

	external, err := mcp.Load()
	if err != nil {
		return err
	}
	for _, server := range external {
		builder := mcpCfg.AddURLServer(server.Name, server.URL)
		for name, value := range server.Headers {
			builder.Header(name, value)
		}
		builder.Done()
	}

	if err := mcpCfg.WriteToFile(filepath.Join(in.Config.WorkDir, ".mcp.json")); err != nil {
		return err
	}

	if in.Config.Run.IsProxyEnabled() {
		in.consoleToken = consoleToken
		in.consoleURL = consoleURL
	}

	settings := NewSettingsBuilder(in.model)
	if in.Config.Run.Mode == console.AgentRunModeAnalyze ||
		in.Config.Run.Mode == console.AgentRunModeReview {
		settings.AllowTools(
			"Read",
			"Grep",
			"Glob",
			"Bash(ls:*)",
			"Bash(cd:*)",
			"Bash(pwd)",
			"Bash(git status)",
			"Bash(git diff:*)",
			"Bash(git branch:*)",
			"Bash(git log:*)",
			"Bash(git show:*)",
			"Bash(git merge-base:*)",
			"Bash(git rev-parse:*)",
			"Bash(head:*)",
			"Bash(tail:*)",
			"Bash(cat:*)",
			"Bash(grep:*)",
			"Bash(rg:*)",
			"Bash(find:*)",
			"WebFetch",
			PluralMCPToolsWildcard,
			CodebaseMemoryMCPToolsWildcard,
		).AllowTools(externalMCPAllowTools(external)...).DenyTools("Edit", "Write", "Bash(rm:*)", "Bash(sudo:*)")
	} else {
		settings.AllowTools(
			"Read",
			"Write",
			"Edit",
			"MultiEdit",
			"Bash",
			"WebFetch",
			PluralMCPToolsWildcard,
			CodebaseMemoryMCPToolsWildcard,
		).AllowTools(externalMCPAllowTools(external)...)
	}

	defaultTimeout := fmt.Sprintf("%d", in.Config.Run.Runtime.Config.Claude.BashTimeout.Milliseconds())
	maxTimeout := fmt.Sprintf("%d", in.Config.Run.Runtime.Config.Claude.BashMaxTimeout.Milliseconds())
	settings.WithEnv("BASH_DEFAULT_TIMEOUT_MS", defaultTimeout)
	settings.WithEnv("BASH_MAX_TIMEOUT_MS", maxTimeout)
	klog.V(log.LogLevelInfo).InfoS("claude timeouts configured", "default_timeout", defaultTimeout, "max_timeout", maxTimeout)

	return settings.WriteToFile(filepath.Join(in.configPath(), "settings.local.json"))
}

func (in *Claude) agentJSON(agent string) string {
	servers, err := mcp.Load()
	if err != nil {
		klog.ErrorS(err, "failed to load external mcp servers for claude agents")
		return agent
	}
	return agentWithMCPTools(agent, externalMCPAllowTools(servers))
}

func (in *Claude) configPath() string {
	return path.Join(in.Config.WorkDir, ".claude")
}

func (in *Claude) skillsPath() string {
	return path.Join(in.configPath(), "skills")
}

func (in *Claude) withConfigEnv(env []string) []string {
	return append(env, fmt.Sprintf("CLAUDE_CONFIG_DIR=%s", in.configPath()))
}

func (in *Claude) recordSessionID(sessionID string) {
	if sessionID == "" {
		return
	}
	in.sessionID = sessionID
}

func (in *Claude) OnMessage(f v1.MessageCallback) {
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

func emitClaudeContent(event *StreamEvent, toolUseCache map[string]ContentMsg, recorder *usage.Usage, onMessage v1.MessageCallback) {
	if onMessage == nil || event == nil || event.Message == nil {
		return
	}

	var textBuilder strings.Builder
	for _, c := range event.Message.Content {
		klog.V(log.LogLevelExtended).InfoS("claude content", "type", c.Type, "text", c.Text)

		switch c.Type {
		case "tool_use":
			if c.ID != "" {
				toolUseCache[c.ID] = c
			}
			toolMsg := &console.AgentMessageAttributes{
				Role:    console.AiRoleAssistant,
				Message: "Called tool",
				Metadata: &console.AgentMessageMetadataAttributes{
					Tool: &console.AgentMessageToolAttributes{
						Name:   new(c.Name),
						State:  lo.ToPtr(console.AgentMessageToolStateRunning),
						Output: lo.ToPtr(v1.RunningToolOutput),
					},
				},
			}
			if input, err := json.Marshal(c.Input); err == nil {
				toolMsg.Metadata.Tool.Input = new(string(input))
			}
			klog.V(log.LogLevelDebug).InfoS("claude tool use started", "tool_use_id", c.ID, "name", c.Name)
			onMessage(toolMsg, c.ID)
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
			toolMsg := &console.AgentMessageAttributes{
				Role:    console.AiRoleAssistant,
				Message: "Called tool",
				Metadata: &console.AgentMessageMetadataAttributes{
					Tool: &console.AgentMessageToolAttributes{
						Name:   new(toolUseContent.Name),
						State:  new(state),
						Output: new(output),
					},
				},
			}
			if input, err := json.Marshal(toolUseContent.Input); err == nil {
				toolMsg.Metadata.Tool.Input = new(string(input))
			}
			onMessage(toolMsg, c.ToolUseID)
		case "text":
			textBuilder.WriteString(c.Text)
		}
	}

	msg := &console.AgentMessageAttributes{
		Role:    mapRole(event.Message.Role),
		Message: textBuilder.String(),
	}

	if event.Message.Usage != nil {
		cached := event.Message.Usage.CacheCreationInputTokens + event.Message.Usage.CacheReadInputTokens
		inputTokens := event.Message.Usage.InputTokens + cached
		recorder.RecordUsage(usage.Record{
			InputTokens:  inputTokens,
			OutputTokens: event.Message.Usage.OutputTokens,
			CachedTokens: cached,
		})

		total := float64(inputTokens + event.Message.Usage.OutputTokens)
		input := float64(inputTokens)
		output := float64(event.Message.Usage.OutputTokens)

		msg.Cost = &console.AgentMessageCostAttributes{
			Total: total,
			Tokens: &console.AgentMessageTokensAttributes{
				Input:  new(input),
				Output: new(output),
			},
		}
	}

	// Empty text messages are not valid unless they carry cost metadata.
	if len(msg.Message) == 0 {
		if msg.Cost == nil {
			return
		}
		msg.Message = "__plrl_ignore__"
	}

	onMessage(msg, "")
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

func claudeRunArgs(repositoryDir, promptFile, agent string, model Model, prompt, resumeSessionID string) []string {
	args := []string{
		"--add-dir", repositoryDir,
		"--agents", agent,
		"--system-prompt-file", promptFile,
		"--model", string(model),
	}
	if resumeSessionID != "" {
		args = append(args, "--resume", resumeSessionID, "-p", prompt)
	} else {
		args = append(args, "-p", prompt)
	}
	return append(args, "--output-format", "stream-json", "--verbose")
}
