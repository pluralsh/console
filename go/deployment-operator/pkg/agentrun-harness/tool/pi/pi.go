package pi

import (
	"context"
	"encoding/json"
	"fmt"
	"path/filepath"

	"k8s.io/klog/v2"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/internal/helpers"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/mcp"
	proxymodel "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/model"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/artifacts"
	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/usage"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

func New(config v1.Config) v1.Tool {
	runtimeConfig := config.Run.Runtime.Config.Pi
	result := &Pi{
		DefaultTool: v1.DefaultTool{Config: config},
		model:       defaultModel,
		provider:    openAIProvider,
	}
	if runtimeConfig != nil {
		if runtimeConfig.Model != "" {
			result.model = runtimeConfig.Model
		}
		if runtimeConfig.Provider != "" {
			result.provider = runtimeConfig.Provider
		}
		result.apiKey = runtimeConfig.APIKey
		if runtimeConfig.Endpoint != nil {
			result.endpoint = *runtimeConfig.Endpoint
		}
	}
	if config.Run.IsProxyEnabled() {
		result.provider = proxyProviderKey
		result.model = proxymodel.ProxyModel(console.AgentRuntimeTypePi, result.model)
	}
	if err := result.ensure(); err != nil {
		klog.Fatalf("failed to initialize pi tool: %v", err)
	}
	return result
}

func (in *Pi) ensure() error {
	if in.Config.WorkDir == "" {
		return fmt.Errorf("work directory is not set")
	}
	if in.Config.RepositoryDir == "" {
		return fmt.Errorf("repository directory is not set")
	}
	if in.Config.Run == nil || in.Config.Run.Runtime == nil || in.Config.Run.Runtime.Config == nil || in.Config.Run.Runtime.Config.Pi == nil {
		return fmt.Errorf("pi runtime configuration is not set")
	}
	return nil
}

func (in *Pi) Run(ctx context.Context, options ...exec.Option) {
	go in.start(ctx, in.Config.Run.Prompt, "", options...)
}

func (in *Pi) Configure(consoleURL, consoleToken string) error {
	in.consoleURL = consoleURL
	in.consoleToken = consoleToken
	if err := in.ConfigureSystemPrompt(console.AgentRuntimeTypePi); err != nil {
		return err
	}
	if err := in.ConfigureSkills(in.skillsPath()); err != nil {
		return err
	}
	if err := in.writeConfig(); err != nil {
		return err
	}
	return nil
}

func (in *Pi) ConfigureBabysitRun() error {
	if err := in.ConfigureSystemPromptForBabysitRun(console.AgentRuntimeTypePi); err != nil {
		return err
	}
	return in.ConfigureSkills(in.skillsPath())
}

func (in *Pi) OnMessage(f v1.MessageCallback) {
	in.onMessage = f
}

func (in *Pi) BabysitRun(ctx context.Context, bCtx *v1.BabysitContext) bool {
	if bCtx == nil {
		return false
	}
	if err := in.run(ctx, bCtx.Prompt, in.sessionID, true); err != nil {
		in.Config.ErrorChan <- err
	}
	return false
}

func (in *Pi) FollowUpRun(ctx context.Context, prompt string) error {
	return in.run(ctx, prompt, in.sessionID, false)
}

func (in *Pi) start(ctx context.Context, prompt, session string, options ...exec.Option) {
	if in.onMessage != nil {
		in.onMessage(&console.AgentMessageAttributes{Message: prompt, Role: console.AiRoleUser}, "")
	}
	if err := in.runWithOptions(ctx, prompt, session, options...); err != nil {
		klog.ErrorS(err, "pi execution failed")
		in.Config.ErrorChan <- err
	}
}

func (in *Pi) run(ctx context.Context, prompt, session string, emitUser bool) error {
	if emitUser && in.onMessage != nil {
		in.onMessage(&console.AgentMessageAttributes{Message: prompt, Role: console.AiRoleUser}, "")
	}
	return in.runWithOptions(ctx, prompt, session)
}

func (in *Pi) runWithOptions(ctx context.Context, prompt, session string, options ...exec.Option) error {
	in.executable = exec.NewExecutable(
		"pi",
		append(options,
			exec.WithArgs(in.args(prompt, session)),
			exec.WithEnv(in.env()),
			exec.WithDir(in.Config.RepositoryDir),
			exec.WithTimeout(in.Config.Run.Runtime.Config.Pi.Timeout),
		)...,
	)
	return in.executable.RunStream(ctx, in.handleStreamLine)
}

func (in *Pi) args(prompt, session string) []string {
	args := []string{
		"--mode", "json",
		"--approve",
		"--provider", in.provider,
		"--model", in.model,
		"--session-dir", in.sessionsPath(),
		"--extension", piMCPExtensionPath,
		"--mcp-config", in.mcpConfigPath(),
	}
	if session != "" {
		args = append(args, "--session", session)
	}
	proxyEnabled := in.Config.Run != nil && in.Config.Run.IsProxyEnabled()
	if !proxyEnabled && in.apiKey != "" {
		args = append(args, "--api-key", in.apiKey)
	}
	return append(args, prompt)
}

func (in *Pi) env() []string {
	apiKey := in.apiKey
	if in.Config.Run.IsProxyEnabled() {
		apiKey = in.consoleToken
	}
	return []string{
		fmt.Sprintf("PI_CODING_AGENT_DIR=%s", in.piHome()),
		fmt.Sprintf("%s=%s", pluralAPIKeyEnv, in.consoleToken),
		fmt.Sprintf("%s=%s", openAIAPIKeyEnv, apiKey),
	}
}

func (in *Pi) piHome() string {
	return filepath.Join(in.Config.WorkDir, ".pi", "agent")
}

func (in *Pi) skillsPath() string {
	return filepath.Join(in.piHome(), "skills")
}

func (in *Pi) sessionsPath() string {
	return filepath.Join(in.piHome(), "sessions")
}

func (in *Pi) configPath() string {
	return filepath.Join(in.piHome(), "models.json")
}

func (in *Pi) mcpConfigPath() string {
	return filepath.Join(in.piHome(), "mcp.json")
}

func (in *Pi) writeConfig() error {
	endpoint := in.endpoint
	if in.Config.Run.IsProxyEnabled() {
		endpoint = fmt.Sprintf("%s/ext/ai/v1", in.consoleURL)
		if in.Config.Run.IsStreamingProxyEnabled() {
			endpoint = common.AgentOpenAIBaseURL
		}
	}
	provider := in.provider
	if endpoint != "" {
		if in.Config.Run.IsProxyEnabled() {
			// Use a non-"openai" provider key so the Pi CLI does not strip the
			// "openai/" prefix from the model ID before calling the proxy endpoint.
			provider = proxyProviderKey
		} else {
			// For custom non-proxy endpoints keep the openai provider so Pi uses
			// its built-in OpenAI-compatible client.
			provider = openAIProvider
		}
		in.provider = provider
	}
	models := map[string]any{"providers": map[string]any{}}
	if endpoint != "" {
		models["providers"].(map[string]any)[provider] = map[string]any{
			"baseUrl": endpoint,
			"apiKey":  fmt.Sprintf("$%s", openAIAPIKeyEnv),
			"api":     "openai-responses",
			"models": []map[string]any{{
				"id":            in.model,
				"contextWindow": 128000,
				"maxTokens":     16384,
			}},
		}
	}
	data, err := json.Marshal(models)
	if err != nil {
		return fmt.Errorf("marshal pi model config: %w", err)
	}
	if err := helpers.File().Create(in.configPath(), string(data), 0644); err != nil {
		return fmt.Errorf("write pi model config: %w", err)
	}

	mcp := map[string]any{
		"mcpServers": map[string]any{
			"plural": map[string]any{
				"url":         common.AgentMCPServerURL,
				"directTools": true,
			},
			common.CodebaseMemoryMCPServerName: map[string]any{
				"command": common.CodebaseMemoryMCPCommand,
				"env": map[string]string{
					common.CodebaseMemoryCacheEnv: common.CodebaseMemoryCacheDir,
				},
				"directTools": true,
			},
		},
	}
	if err := addExternalMCPServers(mcp["mcpServers"].(map[string]any)); err != nil {
		return err
	}
	mcpData, err := json.Marshal(mcp)
	if err != nil {
		return fmt.Errorf("marshal pi mcp config: %w", err)
	}
	if err := helpers.File().Create(in.mcpConfigPath(), string(mcpData), 0644); err != nil {
		return fmt.Errorf("write pi mcp config: %w", err)
	}
	return nil
}

func addExternalMCPServers(servers map[string]any) error {
	external, err := mcp.Load()
	if err != nil {
		return fmt.Errorf("load external mcp servers: %w", err)
	}
	for _, server := range external {
		entry := map[string]any{
			"url": server.URL,
		}
		if len(server.Headers) > 0 {
			entry["headers"] = server.Headers
		}
		if server.HasAllowedTools() {
			entry["directTools"] = server.AllowedTools
			entry["includeTools"] = server.AllowedTools
		} else {
			entry["directTools"] = true
		}
		servers[server.Name] = entry
	}
	return nil
}

func (in *Pi) UploadArtifacts(ctx context.Context) (*artifacts.UploadArtifacts, error) {
	return in.BuildUploadArtifacts(ctx, artifacts.BuildArtifactsOptions{
		Provider:  "pi",
		Source:    artifacts.SessionSource{Path: in.sessionsPath(), ArchivePath: "sessions"},
		SessionID: in.sessionID,
	})
}

func (in *Pi) handleStreamLine(line []byte) {
	var event StreamEvent
	if err := json.Unmarshal(line, &event); err != nil {
		klog.V(log.LogLevelDebug).InfoS("ignoring non-json pi stream line", "line", string(line))
		return
	}
	if event.Type == "session" && event.ID != "" {
		in.sessionID = event.ID
	}
	if event.Type == "tool_execution_update" {
		in.EmitOutput(event.ToolCallID, toolResultText(event.PartialResult))
		return
	}
	message, callID := in.mapStreamEvent(&event)
	if message != nil && in.onMessage != nil {
		in.onMessage(message, callID)
	}
}

func (in *Pi) mapStreamEvent(event *StreamEvent) (*console.AgentMessageAttributes, string) {
	switch event.Type {
	case "tool_execution_start":
		return toolMessage(event.ToolName, console.AgentMessageToolStateRunning, rawString(event.Args), v1.RunningToolOutput), event.ToolCallID
	case "tool_execution_end":
		state := console.AgentMessageToolStateCompleted
		if event.IsError {
			state = console.AgentMessageToolStateError
		}
		return toolMessage(event.ToolName, state, rawString(event.Args), toolResultText(event.Result)), event.ToolCallID
	case "message_end":
		return in.messageEnd(event.Message), ""
	case "error":
		if event.Error != nil && event.Error.Message != "" {
			return &console.AgentMessageAttributes{Role: console.AiRoleAssistant, Message: event.Error.Message}, ""
		}
	}
	return nil, ""
}

func (in *Pi) messageEnd(message *AgentMessage) *console.AgentMessageAttributes {
	if message == nil || message.Role != "assistant" {
		return nil
	}
	text := assistantText(message.Content)
	if text == "" && message.Usage == nil {
		return nil
	}
	result := &console.AgentMessageAttributes{Role: console.AiRoleAssistant, Message: text}
	if result.Message == "" {
		result.Message = "__plrl_ignore__"
	}
	if message.Usage != nil {
		total := message.Usage.Total
		if total == 0 {
			total = message.Usage.Input + message.Usage.Output
		}
		cost := 0.0
		if message.Usage.Cost != nil {
			cost = message.Usage.Cost.Total
		}
		in.Config.Usage.RecordUsage(usage.Record{
			InputTokens:     message.Usage.Input,
			OutputTokens:    message.Usage.Output,
			TotalTokens:     total,
			CachedTokens:    message.Usage.CacheRead + message.Usage.CacheWrite,
			ReasoningTokens: message.Usage.Reasoning,
			TotalCost:       cost,
		})
		result.Cost = &console.AgentMessageCostAttributes{
			Total: cost,
			Tokens: &console.AgentMessageTokensAttributes{
				Input:  new(float64(message.Usage.Input)),
				Output: new(float64(message.Usage.Output)),
			},
		}
	}
	return result
}

func assistantText(content json.RawMessage) string {
	text, _ := contentBlocksText(content)
	return text
}

func rawString(value json.RawMessage) string {
	if len(value) == 0 || string(value) == "null" {
		return ""
	}
	return string(value)
}

func toolResultText(value json.RawMessage) string {
	if len(value) == 0 || string(value) == "null" {
		return ""
	}
	if text, ok := contentBlocksText(value); ok {
		return text
	}
	var wrapped struct {
		Content json.RawMessage `json:"content"`
	}
	if json.Unmarshal(value, &wrapped) == nil && len(wrapped.Content) > 0 {
		if text, ok := contentBlocksText(wrapped.Content); ok {
			// Empty content arrays are partial results with no stdout yet.
			// Returning the wrapper JSON would poison later delta slicing.
			return text
		}
	}
	var s string
	if json.Unmarshal(value, &s) == nil {
		return s
	}
	return string(value)
}

func contentBlocksText(value json.RawMessage) (string, bool) {
	var blocks []contentBlock
	if json.Unmarshal(value, &blocks) != nil {
		return "", false
	}
	text := ""
	for _, block := range blocks {
		if block.Type == "text" {
			text += block.Text
		}
	}
	return text, true
}
