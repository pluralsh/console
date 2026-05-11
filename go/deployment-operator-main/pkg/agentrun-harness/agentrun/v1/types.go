package v1

import (
	"encoding/json"
	"time"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/deployment-operator/internal/controller"
	"github.com/pluralsh/deployment-operator/internal/helpers"
)

const (
	// defaultTimeout is the default timeout for AI provider CLI execution.
	defaultTimeout = 120 * time.Minute

	// defaultBashTimeout is the default timeout for any bash command Claude executes.
	defaultBashTimeout = 30 * time.Minute

	// defaultBashMaxTimeout is the maximum time Claude is permitted to wait
	// for a command before it is terminated.
	defaultBashMaxTimeout = defaultTimeout

	// defaultInactivityTimeout is the default Gemini CLI timeout for the process,
	// tool call, or session if there is no output or input detected.
	defaultInactivityTimeout = defaultBashTimeout

	defaultBabysitInterval = int64(60)
)

type AgentRun struct {
	ID         string                 `json:"id"`
	Prompt     string                 `json:"prompt"`
	Repository string                 `json:"repository"`
	Branch     *string                `json:"branch,omitempty"`
	Mode       console.AgentRunMode   `json:"mode"`
	Status     console.AgentRunStatus `json:"status"`
	FlowID     *string                `json:"flowId,omitempty"`

	// Credentials for SCM and Plural Console
	ScmCreds    *console.ScmCredentialFragment `json:"scmCreds,omitempty"`
	PluralCreds *console.PluralCredsFragment   `json:"pluralCreds,omitempty"`

	// Runtime information
	Runtime *AgentRuntime `json:"runtime,omitempty"`

	DindEnabled    bool
	BrowserEnabled bool

	Babysit         bool
	BabysitInterval int64
}

type AgentRuntime struct {
	ID            string                   `json:"id"`
	Name          string                   `json:"name"`
	Type          console.AgentRuntimeType `json:"type"`
	AiProxy       bool                     `json:"aiProxy"`
	Config        *AgentRuntimeConfig      `json:"config,omitempty"`
	ExaMcpConfigs []ExaMcpServerConfig     `json:"exaMcpConfigs,omitempty"`
}

type ExaMcpServerConfig struct {
	Name string `json:"name"`

	Url string `json:"url"`

	// ApiKey is the raw API key to use for the external MCP server.
	ApiKey *string `json:"apiKey,omitempty"`
}

type AgentRuntimeConfig struct {
	Claude   *ClaudeConfig   `json:"claude,omitempty"`
	OpenCode *OpencodeConfig `json:"opencode,omitempty"`
	Gemini   *GeminiConfig   `json:"gemini,omitempty"`
	Codex    *CodexConfig    `json:"codex,omitempty"`
}

type OpencodeConfig struct {
	Provider string        `json:"provider"`
	Endpoint string        `json:"endpoint"`
	Model    string        `json:"model,omitempty"`
	Token    string        `json:"tokenSecretRef"`
	Timeout  time.Duration `json:"timeout,omitempty"`
}

type ClaudeConfig struct {
	ApiKey         string        `json:"apiKey"`
	Model          string        `json:"model,omitempty"`
	ExtraArgs      []string      `json:"extraArgs,omitempty"`
	Timeout        time.Duration `json:"timeout"`
	BashTimeout    time.Duration `json:"bashTimeout"`
	BashMaxTimeout time.Duration `json:"bashMaxTimeout"`
	Endpoint       *string       `json:"endpoint,omitempty"`
}

type GeminiConfig struct {
	APIKey            string        `json:"apiKey"`
	Model             string        `json:"model,omitempty"`
	Timeout           time.Duration `json:"timeout"`
	InactivityTimeout time.Duration `json:"inactivityTimeout"`
	Endpoint          *string       `json:"endpoint,omitempty"`
}

type CodexConfig struct {
	ApiKey   string        `json:"apiKey"`
	Model    string        `json:"model,omitempty"`
	Timeout  time.Duration `json:"timeout"`
	Endpoint *string       `json:"endpoint,omitempty"`
}

// FromAgentRunFragment converts Console API fragment to harness type
func (ar *AgentRun) FromAgentRunFragment(fragment *console.AgentRunFragment) *AgentRun {
	run := &AgentRun{
		ID:          fragment.ID,
		Prompt:      fragment.Prompt,
		Repository:  fragment.Repository,
		Branch:      fragment.Branch,
		Mode:        fragment.Mode,
		Status:      fragment.Status,
		ScmCreds:    fragment.ScmCreds,
		PluralCreds: fragment.PluralCreds,
		Runtime:     &AgentRuntime{},
	}

	if fragment.Flow != nil {
		run.FlowID = &fragment.Flow.ID
	}

	run.Runtime = ar.fromEnv(fragment.Runtime)

	if helpers.GetPluralEnvBool(controller.EnvDindEnabled, false) {
		run.DindEnabled = true
	}

	if helpers.GetPluralEnvBool(controller.EnvBrowserEnabled, false) {
		run.BrowserEnabled = true
	}

	if fragment.Babysit != nil {
		run.Babysit = *fragment.Babysit
	}
	run.BabysitInterval = defaultBabysitInterval
	if fragment.BabysitInterval != nil {
		run.BabysitInterval = *fragment.BabysitInterval
	}

	return run
}

func (ar *AgentRun) fromEnv(runtime *console.AgentRuntimeFragment) *AgentRuntime {
	result := &AgentRuntime{}

	if runtime == nil {
		return result
	}

	result.ID = runtime.ID
	result.Name = runtime.Name
	result.Type = runtime.Type
	result.AiProxy = runtime.AiProxy != nil && *runtime.AiProxy

	if exaMcpServers := helpers.GetPluralEnv(controller.EnvExaMcpServers, ""); exaMcpServers != "" {
		result.ExaMcpConfigs = []ExaMcpServerConfig{}
		_ = json.Unmarshal([]byte(exaMcpServers), &result.ExaMcpConfigs)
	}

	config := &AgentRuntimeConfig{}
	switch runtime.Type {
	case console.AgentRuntimeTypeClaude:
		config.Claude = &ClaudeConfig{
			ApiKey:         helpers.GetEnv(controller.EnvClaudeToken, ""),
			Model:          helpers.GetPluralEnv(controller.EnvClaudeModel, ""),
			ExtraArgs:      helpers.GetPluralEnvSlice(controller.EnvClaudeArgs, nil),
			Timeout:        helpers.GetPluralEnvDuration(controller.EnvExecTimeout, defaultTimeout),
			BashTimeout:    helpers.GetPluralEnvDuration(controller.EnvClaudeBashDefaultTimeout, defaultBashTimeout),
			BashMaxTimeout: helpers.GetPluralEnvDuration(controller.EnvClaudeBashMaxTimeout, defaultBashMaxTimeout),
		}
		if endpoint := helpers.GetPluralEnv(controller.EnvClaudeEndpoint, ""); endpoint != "" {
			config.Claude.Endpoint = &endpoint
		}
	case console.AgentRuntimeTypeOpencode:
		config.OpenCode = &OpencodeConfig{
			Provider: helpers.GetPluralEnv(controller.EnvOpenCodeProvider, ""),
			Endpoint: helpers.GetPluralEnv(controller.EnvOpenCodeEndpoint, ""),
			Model:    helpers.GetPluralEnv(controller.EnvOpenCodeModel, ""),
			Token:    helpers.GetPluralEnv(controller.EnvOpenCodeToken, ""),
			Timeout:  helpers.GetPluralEnvDuration(controller.EnvExecTimeout, defaultTimeout),
		}
	case console.AgentRuntimeTypeGemini:
		config.Gemini = &GeminiConfig{
			APIKey:            helpers.GetPluralEnv(controller.EnvGeminiAPIKey, ""),
			Model:             helpers.GetPluralEnv(controller.EnvGeminiModel, ""),
			Timeout:           helpers.GetPluralEnvDuration(controller.EnvExecTimeout, defaultTimeout),
			InactivityTimeout: helpers.GetPluralEnvDuration(controller.EnvGeminiInactivityTimeout, defaultInactivityTimeout),
		}
		if endpoint := helpers.GetPluralEnv(controller.EnvGeminiEndpoint, ""); endpoint != "" {
			config.Gemini.Endpoint = &endpoint
		}
	case console.AgentRuntimeTypeCodex:
		config.Codex = &CodexConfig{
			ApiKey:  helpers.GetPluralEnv(controller.EnvCodexAPIKey, ""),
			Model:   helpers.GetPluralEnv(controller.EnvCodexModel, ""),
			Timeout: helpers.GetPluralEnvDuration(controller.EnvExecTimeout, defaultTimeout),
		}
		if endpoint := helpers.GetPluralEnv(controller.EnvCodexEndpoint, ""); endpoint != "" {
			config.Codex.Endpoint = &endpoint
		}
	}

	result.Config = config
	return result
}

func (ar *AgentRun) IsProxyEnabled() bool {
	return ar.Runtime != nil && ar.Runtime.AiProxy
}
