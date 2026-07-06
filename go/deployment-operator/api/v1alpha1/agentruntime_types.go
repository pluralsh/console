package v1alpha1

import (
	"fmt"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/algorithms"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const AgentRuntimeNameLabel = "deployments.plural.sh/agent-runtime-name"

func secretKeySelectorSet(ref *corev1.SecretKeySelector) bool {
	return ref != nil && ref.Name != "" && ref.Key != ""
}

// AgentRuntimeSpec defines the desired state of AgentRuntime
//
// +kubebuilder:validation:XValidation:rule="!has(self.streamingProxy) || !self.streamingProxy || (has(self.aiProxy) && self.aiProxy)",message="streamingProxy requires aiProxy to be enabled"
type AgentRuntimeSpec struct {
	// Name of this AgentRuntime.
	// If not provided, the name from AgentRuntime.ObjectMeta will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Default indicates whether this is the default agent runtime for coding agents.
	// +kubebuilder:validation:Optional
	Default *bool `json:"default,omitempty"`

	// +kubebuilder:validation:Required
	TargetNamespace string `json:"targetNamespace"`

	// Type specifies the agent runtime to use for executing the stack.
	// One of CLAUDE, OPENCODE, GEMINI, CODEX, CUSTOM.
	// +kubebuilder:validation:Enum=CLAUDE;OPENCODE;GEMINI;CODEX;CUSTOM
	// +kubebuilder:validation:Required
	Type console.AgentRuntimeType `json:"type"`

	// Bindings define the creation permissions for this agent runtime.
	// +kubebuilder:validation:Optional
	Bindings *AgentRuntimeBindings `json:"bindings,omitempty"`

	// Template defines the pod template for this agent runtime.
	Template *corev1.PodTemplateSpec `json:"template,omitempty"`

	// Config contains typed configuration depending on the chosen runtime type.
	// +kubebuilder:validation:Optional
	Config *AgentRuntimeConfig `json:"config,omitempty"`

	// AiProxy routes LLM requests through the Console AI proxy (/ext/ai) using the deploy token,
	// so provider API keys in spec.config are optional.
	//
	// Set the model on the runtime-specific config block (for example spec.config.codex.model).
	// The proxy expects models in provider/name format (for example openai/gpt-5.4,
	// anthropic/claude-sonnet-4-5, vertex/gemini-2.5-pro). Values that already include a "/"
	// are passed through unchanged.
	//
	// When only a bare model id is given, the harness may prefix it by runtime type:
	//   - CLAUDE: anthropic/{model} (for example claude-sonnet-4-5 -> anthropic/claude-sonnet-4-5)
	//   - CODEX, OPENCODE: openai/{model} (for example gpt-5.4 -> openai/gpt-5.4)
	//   - GEMINI: vertex/{model}
	//   - CUSTOM: no automatic prefix; use provider/name explicitly
	AiProxy *bool `json:"aiProxy,omitempty"`

	// StreamingProxy routes OpenAI-compatible LLM requests through the in-pod mcpserver
	// sse conversion proxy before they reach the Console AI proxy (/ext/ai). Only valid when aiProxy
	// is enabled. Applies to CODEX and OPENCODE runtimes.
	// +kubebuilder:validation:Optional
	StreamingProxy *bool `json:"streamingProxy,omitempty"`

	// Dind enables Docker-in-Docker for this agent runtime.
	// When true, the runtime will be configured to run with DinD support.
	// +kubebuilder:validation:Optional
	Dind *bool `json:"dind,omitempty"`

	// Memory enables team-shared codebase-memory persistence for this agent runtime.
	// When true, agents may create and commit .codebase-memory/ graph artifacts
	// by default so future runs can bootstrap from the persisted index. When false
	// or unset, codebase-memory indexes stay in the pod-local cache and generated
	// .codebase-memory/ artifacts are excluded from commits.
	// +kubebuilder:validation:Optional
	Memory *bool `json:"memory,omitempty"`

	// AllowedRepositories the git repositories allowed to be used with this runtime.
	// +kubebuilder:validation:Optional
	AllowedRepositories []string `json:"allowedRepositories,omitempty"`

	// Browser configuration augments agent runtime with a headless browser.
	// When provided, the runtime will be configured to run with a headless browser available
	// for the agent to use.
	// +kubebuilder:validation:Optional
	Browser *BrowserConfig `json:"browser,omitempty"`

	// BootstrapScript is a bash script that will be executed inside the cloned repository
	// directory before the coding agent starts. It can be used to install dependencies,
	// configure tooling, or perform any other setup required by the agent.
	// +kubebuilder:validation:Optional
	BootstrapScript *string `json:"bootstrapScript,omitempty"`

	// Git configure commit signing on agent run. When provided, the runtime will be configured to sign git commits using the provided key reference.
	Git *GitSpec `json:"git,omitempty"`

	// BabysitInterval configures the interval for the operator to check on the health of the agent runtime and perform necessary babysitting actions (e.g. restarting unhealthy runtimes). When not provided, a default interval of 1 minute will be used.
	BabysitInterval *metav1.Duration `json:"babysitInterval,omitempty"`

	// ScmConnection is the name of an ScmConnection in Console to use for git operations on agent runs using this runtime.
	// This should match the name of an existing ScmConnection resource or connection created in the Plural UI.
	// +kubebuilder:validation:Optional
	ScmConnection *string `json:"scmConnection,omitempty"`

	// ExaConnection enables Exa web search and content retrieval tools on the Plural MCP server.
	ExaConnection *ExaConnection `json:"exaConnection,omitempty"`
}

type ExaConnection struct {
	// URL is the Exa API base URL. Defaults to https://api.exa.ai when unset.
	// +kubebuilder:validation:Optional
	URL *string `json:"url,omitempty"`

	// ApiKeySecretRef references a Secret containing the Exa API key.
	// +kubebuilder:validation:Optional
	ApiKeySecretRef *corev1.SecretKeySelector `json:"apiKeySecretRef,omitempty"`

	// ProxyURL is an HTTP proxy URL used for Exa API requests.
	// +kubebuilder:validation:Optional
	ProxyURL *string `json:"proxyUrl,omitempty"`
}

type GitSpec struct {
	Proxy         *string                   `json:"proxy,omitempty"`
	SigningKeyRef *corev1.SecretKeySelector `json:"signingKeyRef,omitempty"`
}

// Browser defines the browser to use for the agent runtime.
type Browser string

const (
	BrowserChrome           Browser = "chrome"
	BrowserChromium         Browser = "chromium"
	BrowserFirefox          Browser = "firefox"
	BrowserSeleniumChrome   Browser = "selenium-chrome"
	BrowserSeleniumChromium Browser = "selenium-chromium"
	BrowserSeleniumFirefox  Browser = "selenium-firefox"
	BrowserSeleniumEdge     Browser = "selenium-edge"
	BrowserPuppeteer        Browser = "puppeteer"
	BrowserCustom           Browser = "custom"
)

// BrowserConfig is the configuration for the browser runtime.
// It allows AgentRuntime to leverage a headless browser for executing and testing code.
type BrowserConfig struct {
	// Enabled controls whether the browser runtime is enabled for this agent runtime.
	//
	// +kubebuilder:validation:Required
	Enabled bool `json:"enabled"`

	// Browser defines the browser to use. When using non-custom options,
	// predefined images with validated configurations will be used. Default configuration
	// can be overridden by specifying a custom Container. When using a "custom" browser,
	// a custom Container configuration must be provided.
	//
	// Available options are:
	// - chrome - uses browserless/chrome image
	// - chromium - uses browserless/chromium image
	// - firefox - uses browserless/firefox image
	// - selenium-chrome - uses selenium/standalone-chrome image
	// - selenium-chromium - uses selenium/standalone-chromium image
	// - selenium-firefox - uses selenium/standalone-firefox image
	// - selenium-edge - uses selenium/standalone-edge image
	// - puppeteer - uses browserless/chromium image
	// - custom
	//
	// Default: chrome
	//
	// +kubebuilder:validation:Enum:=chrome;chromium;firefox;selenium-chrome;selenium-chromium;selenium-firefox;selenium-edge;puppeteer;custom
	// +kubebuilder:default:=chrome
	// +kubebuilder:validation:Optional
	Browser *Browser `json:"browser,omitempty"`

	// Container defines the container to use for the browser runtime.
	// For custom images, ensure the container starts a browser server and binds to
	// the predetermined port 3000 for remote access from the main agent container.
	// When using a predefined image, only partial overrides are allowed, including:
	// - environment variables
	// - resource limits
	// - image pull policy
	//
	//
	// # Examples
	//
	// Selenium:
	//   name: browser
	//   image: selenium/standalone-chrome:144.0
	//   env:
	//   - name: SE_OPTS
	//     value: "--port 3000"
	//
	// +kubebuilder:validation:Optional
	Container *corev1.Container `json:"container,omitempty"`
}

func (in *BrowserConfig) IsEnabled() bool {
	return in != nil && in.Enabled
}

type PodTemplateSpec struct {
	// Labels to apply to the job for organization and selection.
	// +kubebuilder:validation:Optional
	Labels map[string]string `json:"labels,omitempty"`

	// Annotations to apply to the job for additional metadata.
	// +kubebuilder:validation:Optional
	Annotations map[string]string `json:"annotations,omitempty"`

	// Specification of the desired behavior of the pod.
	// More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#spec-and-status
	// +optional
	Spec corev1.PodSpec `json:"spec,omitempty"`
}

// AgentRuntimeConfig contains typed configuration for the agent runtime.
type AgentRuntimeConfig struct {
	// Config for Claude CLI runtime.
	// +kubebuilder:validation:Optional
	Claude *ClaudeConfig `json:"claude,omitempty"`

	// Config for OpenCode CLI runtime.
	// +kubebuilder:validation:Optional
	OpenCode *OpenCodeConfig `json:"opencode,omitempty"`

	// Config for Gemini CLI runtime.
	// +kubebuilder:validation:Optional
	Gemini *GeminiConfig `json:"gemini,omitempty"`

	// Codex config for Codex CLI runtime.
	// +kubebuilder:validation:Optional
	Codex *CodexConfig `json:"codex,omitempty"`
}

func (in *AgentRuntimeConfig) ToAgentRuntimeConfigRaw(secretGetter func(corev1.SecretKeySelector) (*corev1.Secret, error), aiProxy bool) (*AgentRuntimeConfigRaw, error) {
	if in == nil {
		return nil, nil
	}

	openCode, err := in.OpenCode.ToOpenCodeConfigRaw(secretGetter, aiProxy)
	if err != nil {
		return nil, err
	}

	claude, err := in.Claude.ToClaudeConfigRaw(secretGetter)
	if err != nil {
		return nil, err
	}

	gemini, err := in.Gemini.Raw(secretGetter)
	if err != nil {
		return nil, err
	}

	codex, err := in.Codex.ToCodexConfigRaw(secretGetter)
	if err != nil {
		return nil, err
	}

	return &AgentRuntimeConfigRaw{
		Gemini:   gemini,
		Claude:   claude,
		OpenCode: openCode,
		Codex:    codex,
	}, nil
}

// AgentRuntimeConfigRaw contains raw configuration for the agent runtime.
//
// NOTE: Do not embed this struct directly, use AgentRuntimeConfig instead.
// This is only used to read original AgentRuntimeConfig secret data and be
// able to inject it into the pod as env vars.
type AgentRuntimeConfigRaw struct {
	// Claude is the raw configuration for the Claude runtime.
	// +kubebuilder:validation:Optional
	Claude *ClaudeConfigRaw `json:"claude,omitempty"`

	// OpenCode is the raw configuration for the OpenCode runtime.
	// +kubebuilder:validation:Optional
	OpenCode *OpenCodeConfigRaw `json:"opencode,omitempty"`

	// Gemini is the raw configuration for the Gemini runtime.
	// +kubebuilder:validation:Optional
	Gemini *GeminiConfigRaw `json:"gemini,omitempty"`

	// Codex is the raw configuration for the Codex runtime.
	// +kubebuilder:validation:Optional
	Codex *CodexConfigRaw `json:"codex,omitempty"`
}

func (in *ExaConnection) ToExaConnectionRaw(secretGetter func(corev1.SecretKeySelector) (*corev1.Secret, error)) (*ExaConnectionRaw, error) {
	if in == nil {
		return nil, nil
	}

	exaConnection := &ExaConnectionRaw{
		URL:      in.URL,
		ProxyURL: in.ProxyURL,
	}
	if secretKeySelectorSet(in.ApiKeySecretRef) {
		apiKeySecret, err := secretGetter(*in.ApiKeySecretRef)
		if err != nil {
			return nil, err
		}

		apiKey, exists := apiKeySecret.Data[in.ApiKeySecretRef.Key]
		if !exists {
			return nil, fmt.Errorf("API key secret does not contain key %s", in.ApiKeySecretRef.Key)
		}
		exaConnection.ApiKey = lo.ToPtr(string(apiKey))
	}

	return exaConnection, nil
}

type ExaConnectionRaw struct {
	URL *string `json:"url,omitempty"`

	// ApiKey is the raw Exa API key.
	ApiKey *string `json:"apiKey,omitempty"`

	ProxyURL *string `json:"proxyUrl,omitempty"`
}

type CodexConfigRaw struct {
	// ApiKey is the raw API key to use.
	ApiKey string `json:"apiKey,omitempty"`

	// Model to use.
	Model *string `json:"model,omitempty"`

	// Method configures which OpenAI API Codex should use.
	// AUTO omits wire_api and lets Codex choose. CHAT forces /chat/completions.
	// RESPONSES forces /responses.
	// +kubebuilder:validation:Enum=CHAT;RESPONSES;AUTO
	// +kubebuilder:validation:Optional
	Method *console.OpenAiMethod `json:"method,omitempty"`

	// Endpoint is the base URL for the Codex API (supports OpenAI/Azure-compatible endpoints).
	// +kubebuilder:validation:Optional
	Endpoint *string `json:"endpoint,omitempty"`

	// Timeout bounds a single codex run invocation.
	// +kubebuilder:validation:Optional
	Timeout *metav1.Duration `json:"timeout,omitempty"`
}

type CodexConfig struct {
	// ApiKeySecretRef references a Secret containing the Codex API key.
	// Optional when aiProxy is enabled; authentication uses the Console deploy token instead.
	// +kubebuilder:validation:Optional
	ApiKeySecretRef *corev1.SecretKeySelector `json:"apiKeySecretRef,omitempty"`

	// Model to use.
	Model *string `json:"model,omitempty"`

	// Method configures which OpenAI API Codex should use.
	// AUTO omits wire_api and lets Codex choose. CHAT forces /chat/completions.
	// RESPONSES forces /responses.
	// +kubebuilder:validation:Enum=CHAT;RESPONSES;AUTO
	// +kubebuilder:validation:Optional
	Method *console.OpenAiMethod `json:"method,omitempty"`

	// Endpoint is the base URL for the Codex API (supports OpenAI/Azure-compatible endpoints).
	// +kubebuilder:validation:Optional
	Endpoint *string `json:"endpoint,omitempty"`

	// Timeout bounds a single codex run invocation.
	// +kubebuilder:validation:Optional
	Timeout *metav1.Duration `json:"timeout,omitempty"`
}

func (in *CodexConfig) ToCodexConfigRaw(secretGetter func(corev1.SecretKeySelector) (*corev1.Secret, error)) (*CodexConfigRaw, error) {
	if in == nil {
		return nil, nil
	}

	result := &CodexConfigRaw{
		Model:    in.Model,
		Method:   in.Method,
		Endpoint: in.Endpoint,
		Timeout:  in.Timeout,
	}

	if !secretKeySelectorSet(in.ApiKeySecretRef) {
		return result, nil
	}

	tokenSecret, err := secretGetter(*in.ApiKeySecretRef)
	if err != nil {
		return nil, err
	}

	token, exists := tokenSecret.Data[in.ApiKeySecretRef.Key]
	if !exists {
		return nil, fmt.Errorf("token secret does not contain key %s", in.ApiKeySecretRef.Key)
	}

	result.ApiKey = string(token)
	return result, nil
}

// ClaudeConfig contains configuration for the Claude CLI runtime.
type ClaudeConfig struct {
	// ApiKeySecretRef references a Secret containing the Claude API key.
	// Optional when aiProxy is enabled; authentication uses the Console deploy token instead.
	// +kubebuilder:validation:Optional
	ApiKeySecretRef *corev1.SecretKeySelector `json:"apiKeySecretRef,omitempty"`

	// Model Name of the model to use.
	Model *string `json:"model,omitempty"`

	// Endpoint is the base URL for the Claude API (supports Bedrock/Anthropic-compatible endpoints).
	// +kubebuilder:validation:Optional
	Endpoint *string `json:"endpoint,omitempty"`

	// ExtraArgs CLI args for advanced flags not modeled here
	ExtraArgs []string `json:"extraArgs,omitempty"`

	// Timeout bounds a single claude CLI run invocation.
	// +kubebuilder:validation:Optional
	Timeout *metav1.Duration `json:"timeout,omitempty"`

	// BashTimeout is the default timeout for any bash command Claude execute.
	// +kubebuilder:validation:Optional
	BashTimeout *metav1.Duration `json:"bashTimeout,omitempty"`

	// BashMaxTimeout is the maximum time Claude is permitted to wait
	// for a command before it is terminated.
	// +kubebuilder:validation:Optional
	BashMaxTimeout *metav1.Duration `json:"bashMaxTimeout,omitempty"`
}

// ClaudeConfigRaw contains configuration for the Claude CLI runtime.
//
// NOTE: Do not embed this struct directly, use ClaudeConfig instead.
// This is only used to read original ClaudeConfig secret data and be
// able to inject it into the pod as env vars.
type ClaudeConfigRaw struct {
	// ApiKey is the raw API key to use.
	ApiKey string `json:"apiKey,omitempty"`

	// Model Name of the model to use.
	Model *string `json:"model,omitempty"`

	// Endpoint is the base URL for the Claude API (supports Bedrock/Anthropic-compatible endpoints).
	// +kubebuilder:validation:Optional
	Endpoint *string `json:"endpoint,omitempty"`

	// ExtraArgs CLI args for advanced flags not modeled here
	ExtraArgs []string `json:"extraArgs,omitempty"`

	// Timeout bounds a single claude CLI run invocation.
	// +kubebuilder:validation:Optional
	Timeout *metav1.Duration `json:"timeout,omitempty"`

	// BashTimeout is the default timeout for any bash command Claude executes.
	// +kubebuilder:validation:Optional
	BashTimeout *metav1.Duration `json:"bashTimeout,omitempty"`

	// BashMaxTimeout is the maximum time Claude is permitted to wait
	// for a command before it is terminated.
	// +kubebuilder:validation:Optional
	BashMaxTimeout *metav1.Duration `json:"bashMaxTimeout,omitempty"`
}

func (in *ClaudeConfig) ToClaudeConfigRaw(secretGetter func(corev1.SecretKeySelector) (*corev1.Secret, error)) (*ClaudeConfigRaw, error) {
	if in == nil {
		return nil, nil
	}

	result := &ClaudeConfigRaw{
		Model:          in.Model,
		Endpoint:       in.Endpoint,
		ExtraArgs:      in.ExtraArgs,
		Timeout:        in.Timeout,
		BashTimeout:    in.BashTimeout,
		BashMaxTimeout: in.BashMaxTimeout,
	}

	if !secretKeySelectorSet(in.ApiKeySecretRef) {
		return result, nil
	}

	tokenSecret, err := secretGetter(*in.ApiKeySecretRef)
	if err != nil {
		return nil, err
	}

	token, exists := tokenSecret.Data[in.ApiKeySecretRef.Key]
	if !exists {
		return nil, fmt.Errorf("token secret does not contain key %s", in.ApiKeySecretRef.Key)
	}

	result.ApiKey = string(token)
	return result, nil
}

// openCodeOpenAICompatibleProvider is the fixed provider key written to opencode.json and used in CLI --model.
const openCodeOpenAICompatibleProvider = "openai-compatible"

// OpenCodeOpenAICompatibleConfig configures a custom OpenAI-compatible API provider in opencode.json.
// The harness writes a provider block with npm @ai-sdk/openai-compatible. Use this for endpoints
// that are not listed on https://models.dev (for example LiteLLM, vLLM, or a private gateway).
//
// When set and the parent AgentRuntime has spec.aiProxy false, spec.config.opencode.provider and
// spec.config.opencode.endpoint are ignored in favor of this block.
type OpenCodeOpenAICompatibleConfig struct {
	// Endpoint is the OpenAI-compatible API base URL (for example https://litellm.example/v1).
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:MinLength=1
	Endpoint string `json:"endpoint"`

	// Model is the model id exposed by that endpoint.
	// +kubebuilder:validation:Optional
	Model *string `json:"model,omitempty"`

	// TokenSecretRef references a Secret containing the API key for the endpoint.
	// +kubebuilder:validation:Optional
	TokenSecretRef *corev1.SecretKeySelector `json:"tokenSecretRef,omitempty"`
}

// OpenCodeConfig contains configuration for the OpenCode CLI runtime.
type OpenCodeConfig struct {
	// OpenAICompatible configures a custom OpenAI-compatible provider block in opencode.json.
	// When set (and aiProxy is false), provider and endpoint on this struct are ignored in favor
	// of the nested openaiCompatible fields.
	// +kubebuilder:validation:Optional
	OpenAICompatible *OpenCodeOpenAICompatibleConfig `json:"openaiCompatible,omitempty"`

	// Provider is the OpenCode provider id from https://models.dev (for example openai, anthropic,
	// amazon-bedrock, google-vertex, google). Optional.
	//
	// When the parent AgentRuntime has spec.aiProxy enabled, the harness ignores this field and
	// autowires provider "plural", routing requests through the Console AI proxy at /ext/ai/v1
	// using the deploy token. Set spec.config.opencode.model to a bare model id; the harness
	// prefixes it for proxy routing based on runtime type (for example gpt-5.4 -> openai/gpt-5.4).
	//
	// When aiProxy is false, this selects the native OpenCode provider block; credentials come from
	// tokenSecretRef or the provider's usual environment variables. Defaults to plural when omitted.
	// Use exact models.dev slugs (for example amazon-bedrock, google-vertex, google).
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:MaxLength=128
	Provider *string `json:"provider,omitempty"`

	// Endpoint optionally overrides the provider baseURL in opencode.json.
	// When omitted, the harness omits baseURL so OpenCode uses the models.dev default for the provider.
	// +kubebuilder:validation:Optional
	Endpoint *string `json:"endpoint,omitempty"`

	// Model is the LLM model to use.
	// +kubebuilder:validation:Optional
	Model *string `json:"model,omitempty"`

	// TokenSecretRef references a Secret containing the API token for OpenCode.
	// Optional when aiProxy is enabled; authentication uses the Console deploy token instead.
	// +kubebuilder:validation:Optional
	TokenSecretRef *corev1.SecretKeySelector `json:"tokenSecretRef,omitempty"`

	// ExtraArgs args for advanced or experimental CLI flags.
	//
	// Deprecated: It is being ignored by the agent harness.
	ExtraArgs []string `json:"extraArgs,omitempty"`

	// Timeout bounds a single opencode run invocation.
	// +kubebuilder:validation:Optional
	Timeout *metav1.Duration `json:"timeout,omitempty"`
}

func (in *OpenCodeConfig) ToOpenCodeConfigRaw(secretGetter func(corev1.SecretKeySelector) (*corev1.Secret, error), aiProxy bool) (*OpenCodeConfigRaw, error) {
	if in == nil {
		return nil, nil
	}

	if !aiProxy && in.OpenAICompatible != nil {
		compat := in.OpenAICompatible
		result := &OpenCodeConfigRaw{
			Provider:         lo.ToPtr(openCodeOpenAICompatibleProvider),
			Endpoint:         &compat.Endpoint,
			Model:            compat.Model,
			Timeout:          in.Timeout,
			OpenAICompatible: true,
		}

		tokenRef := compat.TokenSecretRef
		if !secretKeySelectorSet(tokenRef) {
			tokenRef = in.TokenSecretRef
		}

		if !secretKeySelectorSet(tokenRef) {
			return result, nil
		}

		tokenSecret, err := secretGetter(*tokenRef)
		if err != nil {
			return nil, err
		}

		token, exists := tokenSecret.Data[tokenRef.Key]
		if !exists {
			return nil, fmt.Errorf("token secret does not contain key %s", tokenRef.Key)
		}

		result.Token = string(token)
		return result, nil
	}

	result := &OpenCodeConfigRaw{
		Provider: in.Provider,
		Endpoint: in.Endpoint,
		Model:    in.Model,
		Timeout:  in.Timeout,
	}

	if !secretKeySelectorSet(in.TokenSecretRef) {
		return result, nil
	}

	tokenSecret, err := secretGetter(*in.TokenSecretRef)
	if err != nil {
		return nil, err
	}

	token, exists := tokenSecret.Data[in.TokenSecretRef.Key]
	if !exists {
		return nil, fmt.Errorf("token secret does not contain key %s", in.TokenSecretRef.Key)
	}

	result.Token = string(token)
	return result, nil
}

// OpenCodeConfigRaw contains configuration for the OpenCode CLI runtime.
//
// NOTE: Do not embed this struct directly, use OpenCodeConfig instead.
// This is only used to read original OpenCodeConfig secret data and be
// able to inject it into the pod as env vars.
type OpenCodeConfigRaw struct {
	// OpenAICompatible is true when spec.config.opencode.openaiCompatible was set on the AgentRuntime.
	OpenAICompatible bool `json:"openaiCompatible,omitempty"`

	// Provider is the OpenCode provider id from https://models.dev.
	Provider *string `json:"provider,omitempty"`

	// Endpoint API endpoint for the OpenCode service.
	Endpoint *string `json:"endpoint,omitempty"`

	// Model is the LLM model to use.
	Model *string `json:"model,omitempty"`

	// Token is the raw API token for OpenCode.
	Token string `json:"token,omitempty"`

	// Timeout bounds a single opencode run invocation.
	// +kubebuilder:validation:Optional
	Timeout *metav1.Duration `json:"timeout,omitempty"`
}

// GeminiConfig contains configuration for the Gemini CLI runtime.
type GeminiConfig struct {
	// APIKeySecretRef references a Secret containing the Gemini API key.
	// Optional when aiProxy is enabled; authentication uses the Console deploy token instead.
	// +kubebuilder:validation:Optional
	APIKeySecretRef *corev1.SecretKeySelector `json:"apiKeySecretRef,omitempty"`

	// Model is the name of the model to use.
	// NOTE: gemini flash lite models and are not fit for the write (agent) mode, and
	// should only be used for analysis.
	// +kubebuilder:validation:Optional
	Model *string `json:"model,omitempty"`

	// Timeout bounds a single gemini run invocation.
	// +kubebuilder:validation:Optional
	Timeout *metav1.Duration `json:"timeout,omitempty"`

	// InactivityTimeout is the timeout for inactivity during a gemini run.
	// +kubebuilder:validation:Optional
	InactivityTimeout *metav1.Duration `json:"inactivityTimeout,omitempty"`

	// +kubebuilder:validation:Optional
	Endpoint *string `json:"endpoint,omitempty"`
}

func (in *GeminiConfig) Raw(secretGetter func(corev1.SecretKeySelector) (*corev1.Secret, error)) (*GeminiConfigRaw, error) {
	if in == nil {
		return nil, nil
	}

	result := &GeminiConfigRaw{
		Model:             in.Model,
		Timeout:           in.Timeout,
		InactivityTimeout: in.InactivityTimeout,
		Endpoint:          in.Endpoint,
	}

	if !secretKeySelectorSet(in.APIKeySecretRef) {
		return result, nil
	}

	apiKeySecret, err := secretGetter(*in.APIKeySecretRef)
	if err != nil {
		return nil, err
	}

	apiKey, exists := apiKeySecret.Data[in.APIKeySecretRef.Key]
	if !exists {
		return nil, fmt.Errorf("API key secret does not contain key %s", in.APIKeySecretRef.Key)
	}

	result.APIKey = string(apiKey)
	return result, nil
}

// GeminiConfigRaw contains configuration for the Gemini CLI runtime.
//
// NOTE: Do not embed this struct directly, use GeminiConfig instead.
// This is only used to read original GeminiConfig secret data and be
// able to inject it into the pod as env vars.
type GeminiConfigRaw struct {
	// APIKey is the raw Gemini API key to use.
	APIKey string `json:"apiKey,omitempty"`

	// Model is the name of the model to use.
	Model *string `json:"model,omitempty"`

	// Timeout bounds a single gemini run invocation.
	// +kubebuilder:validation:Optional
	Timeout *metav1.Duration `json:"timeout,omitempty"`

	// InactivityTimeout is the timeout for inactivity during gemini run.
	// +kubebuilder:validation:Optional
	InactivityTimeout *metav1.Duration `json:"inactivityTimeout,omitempty"`

	// +kubebuilder:validation:Optional
	Endpoint *string `json:"endpoint,omitempty"`
}

type AgentRuntimeBindings struct {
	// Create bindings control who can generate new agent runtimes.
	// +kubebuilder:validation:Optional
	Create []Binding `json:"create,omitempty"`
}

func (in *AgentRuntime) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

func (in *AgentRuntime) IsAiProxyEnabled() bool {
	return in != nil && in.Spec.AiProxy != nil && *in.Spec.AiProxy
}

func (in *AgentRuntime) IsStreamingProxyEnabled() bool {
	return in.IsAiProxyEnabled() && in.Spec.StreamingProxy != nil && *in.Spec.StreamingProxy
}

func (in *AgentRuntime) ConsoleName() string {
	if in.Spec.Name != nil && len(*in.Spec.Name) > 0 {
		return *in.Spec.Name
	}

	return in.Name
}

func (in *AgentRuntime) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

// ConsoleID implements [PluralResource] interface
func (in *AgentRuntime) ConsoleID() *string {
	return in.Status.ID
}

func (in *AgentRuntime) Attributes() console.AgentRuntimeAttributes {
	attrs := console.AgentRuntimeAttributes{
		Name:    in.ConsoleName(),
		Default: in.Spec.Default,
		Type:    in.Spec.Type,
		AiProxy: in.Spec.AiProxy,
	}
	if in.Spec.Bindings != nil {
		attrs.CreateBindings = algorithms.Map(in.Spec.Bindings.Create, func(b Binding) *console.AgentBindingAttributes {
			return &console.AgentBindingAttributes{
				UserEmail: b.UserEmail,
				GroupName: b.GroupName,
			}
		})
	}
	if len(in.Spec.AllowedRepositories) > 0 {
		attrs.AllowedRepositories = lo.ToSlicePtr(in.Spec.AllowedRepositories)
	}
	if in.Spec.BabysitInterval != nil {
		attrs.BabysitInterval = lo.ToPtr(int64(in.Spec.BabysitInterval.Seconds()))
	}
	if in.Spec.ScmConnection != nil && len(*in.Spec.ScmConnection) > 0 {
		attrs.ScmConnection = in.Spec.ScmConnection
	}

	return attrs
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Cluster
//+kubebuilder:printcolumn:name="Id",type="string",JSONPath=".status.id",description="Console ID"

// AgentRuntime is the Schema for the agentruntimes API
type AgentRuntime struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   AgentRuntimeSpec `json:"spec,omitempty"`
	Status Status           `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// AgentRuntimeList contains a list of AgentRuntime
type AgentRuntimeList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []AgentRuntime `json:"items"`
}

func init() {
	SchemeBuilder.Register(&AgentRuntime{}, &AgentRuntimeList{})
}
