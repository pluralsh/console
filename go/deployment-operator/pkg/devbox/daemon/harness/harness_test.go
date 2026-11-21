package harness

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"slices"
	"strings"
	"testing"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

var proxyEndpoints = &devboxv1.HarnessEndpoints{AiProxyUrl: "https://console.example.com/ext/ai/"}

func testConfig(t *testing.T) *Config {
	t.Helper()
	dir := t.TempDir()
	return &Config{
		Home: dir, StateDir: dir,
		BaseEnv: func() []string {
			return []string{"PATH=/usr/bin", "ANTHROPIC_DEFAULT_OPUS_MODEL=stale"}
		},
		CodexBundledModels: func() ([]byte, error) { return nil, errors.New("no codex in tests") },
	}
}

func claudeProxyModels() *devboxv1.ProxyModels {
	return &devboxv1.ProxyModels{
		DefaultModel: "bedrock/us.anthropic.claude-sonnet-4-5-v1:0",
		Models:       []string{"bedrock/us.anthropic.claude-sonnet-4-5-v1:0", "bedrock/us.anthropic.claude-haiku-4-5-v1:0"},
		Aliases: map[string]string{
			"opus":   "bedrock/us.anthropic.claude-sonnet-4-5-v1:0",
			"sonnet": "bedrock/us.anthropic.claude-sonnet-4-5-v1:0",
			"haiku":  "bedrock/us.anthropic.claude-haiku-4-5-v1:0",
		},
	}
}

func envIs(t *testing.T, env []string, key, want string) {
	t.Helper()
	got, ok := EnvValue(env, key)
	if want == "" {
		if ok {
			t.Errorf("%s = %q, want unset", key, got)
		}
		return
	}
	if got != want {
		t.Errorf("%s = %q, want %q", key, got, want)
	}
}

func TestClaudeProxyTiers(t *testing.T) {
	launch := &devboxv1.AgentLaunch{Agent: devboxv1.AgentType_AGENT_TYPE_CLAUDE, ProxyModels: claudeProxyModels()}
	spec, err := testConfig(t).Spec(launch, proxyEndpoints, "")
	if err != nil {
		t.Fatal(err)
	}
	envIs(t, spec.Env, "ANTHROPIC_BASE_URL", "https://console.example.com/ext/ai/anthropic")
	envIs(t, spec.Env, "ANTHROPIC_DEFAULT_OPUS_MODEL", "bedrock/us.anthropic.claude-sonnet-4-5-v1:0")
	envIs(t, spec.Env, "ANTHROPIC_DEFAULT_SONNET_MODEL", "bedrock/us.anthropic.claude-sonnet-4-5-v1:0")
	envIs(t, spec.Env, "ANTHROPIC_DEFAULT_HAIKU_MODEL", "bedrock/us.anthropic.claude-haiku-4-5-v1:0")
	envIs(t, spec.Env, "ANTHROPIC_SMALL_FAST_MODEL", "bedrock/us.anthropic.claude-haiku-4-5-v1:0")
	envIs(t, spec.Env, "ANTHROPIC_MODEL", "")
	if got := claudeAvailableModels(t, spec.Dir); !slices.Equal(got, launch.ProxyModels.Models) {
		t.Errorf("availableModels = %v, want the proxy's models", got)
	}
}

func claudeAvailableModels(t *testing.T, home string) []string {
	t.Helper()
	data, err := os.ReadFile(home + "/.claude/settings.json")
	if err != nil {
		t.Fatal(err)
	}
	var settings struct {
		AvailableModels []string `json:"availableModels"`
	}
	if err := json.Unmarshal(data, &settings); err != nil {
		t.Fatal(err)
	}
	return settings.AvailableModels
}

func TestClaudeAvailableModelsSync(t *testing.T) {
	c := testConfig(t)
	settings := c.Home + "/.claude/settings.json"
	if err := os.MkdirAll(c.Home+"/.claude", 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(settings, []byte(`{"theme": "dark"}`), 0o644); err != nil {
		t.Fatal(err)
	}
	launch := &devboxv1.AgentLaunch{Agent: devboxv1.AgentType_AGENT_TYPE_CLAUDE, ProxyModels: claudeProxyModels()}
	if _, err := c.Spec(launch, proxyEndpoints, ""); err != nil {
		t.Fatal(err)
	}
	data, _ := os.ReadFile(settings)
	if !strings.Contains(string(data), `"theme": "dark"`) {
		t.Errorf("user settings dropped: %s", data)
	}

	// the proxy's list changing replaces the daemon's
	launch.ProxyModels.Models = []string{"openai/gpt-5"}
	if _, err := c.Spec(launch, proxyEndpoints, ""); err != nil {
		t.Fatal(err)
	}
	if got := claudeAvailableModels(t, c.Home); !slices.Equal(got, []string{"openai/gpt-5"}) {
		t.Errorf("availableModels = %v, want the new proxy list", got)
	}

	// switching to the owner's plan removes it
	launch.Billing = devboxv1.BillingMode_BILLING_MODE_SUBSCRIPTION
	if _, err := c.Spec(launch, proxyEndpoints, ""); err != nil {
		t.Fatal(err)
	}
	if got := claudeAvailableModels(t, c.Home); got != nil {
		t.Errorf("availableModels = %v, want removed on subscription billing", got)
	}
}

func TestClaudeAvailableModelsKeepsUserList(t *testing.T) {
	c := testConfig(t)
	if err := os.MkdirAll(c.Home+"/.claude", 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(c.Home+"/.claude/settings.json", []byte(`{"availableModels": ["opus"]}`), 0o644); err != nil {
		t.Fatal(err)
	}
	launch := &devboxv1.AgentLaunch{Agent: devboxv1.AgentType_AGENT_TYPE_CLAUDE, ProxyModels: claudeProxyModels()}
	if _, err := c.Spec(launch, proxyEndpoints, ""); err != nil {
		t.Fatal(err)
	}
	if got := claudeAvailableModels(t, c.Home); !slices.Equal(got, []string{"opus"}) {
		t.Errorf("availableModels = %v, want the user's list kept", got)
	}
}

func TestClaudeSubscriptionIgnoresProxyModels(t *testing.T) {
	launch := &devboxv1.AgentLaunch{
		Agent: devboxv1.AgentType_AGENT_TYPE_CLAUDE, Billing: devboxv1.BillingMode_BILLING_MODE_SUBSCRIPTION,
		ProxyModels: claudeProxyModels(),
	}
	spec, err := testConfig(t).Spec(launch, proxyEndpoints, "opus")
	if err != nil {
		t.Fatal(err)
	}
	envIs(t, spec.Env, "ANTHROPIC_DEFAULT_OPUS_MODEL", "")
	envIs(t, spec.Env, "ANTHROPIC_BASE_URL", "")
	envIs(t, spec.Env, "ANTHROPIC_MODEL", "opus")
}

func TestCodexDefaultsToProxyModel(t *testing.T) {
	launch := &devboxv1.AgentLaunch{
		Agent:       devboxv1.AgentType_AGENT_TYPE_CODEX,
		ProxyModels: &devboxv1.ProxyModels{DefaultModel: "openai/gpt-5", Models: []string{"openai/gpt-5"}},
	}
	c := testConfig(t)
	spec, err := c.Spec(launch, proxyEndpoints, "")
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Contains(spec.Args, `model="openai/gpt-5"`) {
		t.Errorf("args %v don't default the model", spec.Args)
	}
	spec, err = c.Spec(launch, proxyEndpoints, "openai/gpt-5-mini")
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Contains(spec.Args, `model="openai/gpt-5-mini"`) || slices.Contains(spec.Args, `model="openai/gpt-5"`) {
		t.Errorf("args %v don't prefer the box's model", spec.Args)
	}
}

const bundledCodexModels = `{"models": [
  {"slug": "gpt-6-astra", "priority": 1, "use_responses_lite": true, "tool_mode": "code_mode_only", "base_instructions": "astra"},
  {"slug": "gpt-5.5", "priority": 12, "use_responses_lite": false, "tool_mode": null, "base_instructions": "classic", "service_tiers": [{"id": "priority"}]},
  {"slug": "gpt-5.4", "priority": 16, "use_responses_lite": false, "tool_mode": null, "base_instructions": "five-four", "visibility": "hide"}
]}`

func TestCodexCatalogListsProxyModels(t *testing.T) {
	c := testConfig(t)
	c.CodexBundledModels = func() ([]byte, error) { return []byte(bundledCodexModels), nil }
	launch := &devboxv1.AgentLaunch{
		Agent:       devboxv1.AgentType_AGENT_TYPE_CODEX,
		ProxyModels: &devboxv1.ProxyModels{DefaultModel: "openai/gpt-5.4", Models: []string{"openai/gpt-5.4", "anthropic/claude-sonnet-4-5"}},
	}
	spec, err := c.Spec(launch, proxyEndpoints, "")
	if err != nil {
		t.Fatal(err)
	}
	path := c.StateDir + "/harness/codex-models.json"
	if !slices.Contains(spec.Args, fmt.Sprintf("model_catalog_json=%q", path)) {
		t.Fatalf("args %v don't point Codex at the catalog", spec.Args)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var catalog struct {
		Models []map[string]any `json:"models"`
	}
	if err := json.Unmarshal(data, &catalog); err != nil {
		t.Fatal(err)
	}
	if len(catalog.Models) != 2 {
		t.Fatalf("models = %v", catalog.Models)
	}
	known, other := catalog.Models[0], catalog.Models[1]
	if known["slug"] != "openai/gpt-5.4" || known["base_instructions"] != "five-four" || known["visibility"] != "list" {
		t.Errorf("a bundled model should keep its own setup: %v", known)
	}
	if other["slug"] != "anthropic/claude-sonnet-4-5" || other["base_instructions"] != "classic" || len(other["service_tiers"].([]any)) != 0 {
		t.Errorf("other models should clone the leading classic model without speed tiers: %v", other)
	}
}

func TestCodexKeepsItsListWithoutABundledCatalog(t *testing.T) {
	c := testConfig(t)
	c.CodexBundledModels = func() ([]byte, error) { return nil, errors.New("no codex") }
	launch := &devboxv1.AgentLaunch{
		Agent:       devboxv1.AgentType_AGENT_TYPE_CODEX,
		ProxyModels: &devboxv1.ProxyModels{DefaultModel: "openai/gpt-5", Models: []string{"openai/gpt-5"}},
	}
	spec, err := c.Spec(launch, proxyEndpoints, "")
	if err != nil {
		t.Fatal(err)
	}
	for _, a := range spec.Args {
		if strings.HasPrefix(a, "model_catalog_json=") {
			t.Errorf("unexpected catalog arg %q", a)
		}
	}
}

func TestPiRegistersTheProxyProvider(t *testing.T) {
	c := testConfig(t)
	path := c.Home + "/.pi/agent/models.json"
	if err := os.MkdirAll(c.Home+"/.pi/agent", 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(`{"providers": {"ollama": {"baseUrl": "http://localhost:11434/v1"}}}`), 0o644); err != nil {
		t.Fatal(err)
	}
	launch := &devboxv1.AgentLaunch{
		Agent:       devboxv1.AgentType_AGENT_TYPE_PI,
		ProxyModels: &devboxv1.ProxyModels{DefaultModel: "openai/gpt-5", Models: []string{"openai/gpt-5", "anthropic/claude-sonnet-4-5"}},
	}
	spec, err := c.Spec(launch, proxyEndpoints, "openai/gpt-5")
	if err != nil {
		t.Fatal(err)
	}
	envIs(t, spec.Env, "PI_MODEL", "")
	envIs(t, spec.Env, "OPENAI_BASE_URL", "")

	read := func() map[string]map[string]any {
		data, err := os.ReadFile(path)
		if err != nil {
			t.Fatal(err)
		}
		var cfg struct {
			Providers map[string]map[string]any `json:"providers"`
		}
		if err := json.Unmarshal(data, &cfg); err != nil {
			t.Fatal(err)
		}
		return cfg.Providers
	}
	providers := read()
	plural := providers["plural"]
	if plural["baseUrl"] != "https://console.example.com/ext/ai/v1" || plural["apiKey"] != PlaceholderKey || len(plural["models"].([]any)) != 2 {
		t.Errorf("plural provider = %v", plural)
	}
	if _, ok := providers["ollama"]; !ok {
		t.Errorf("user providers dropped: %v", providers)
	}

	if _, err := c.Spec(launch, &devboxv1.HarnessEndpoints{}, ""); err != nil {
		t.Fatal(err)
	}
	if providers := read(); providers["plural"] != nil || providers["ollama"] == nil {
		t.Errorf("without the proxy only the plural provider should go: %v", providers)
	}
}

func TestOpenCodeListsProxyModels(t *testing.T) {
	launch := &devboxv1.AgentLaunch{
		Agent:       devboxv1.AgentType_AGENT_TYPE_OPENCODE,
		ProxyModels: &devboxv1.ProxyModels{DefaultModel: "openai/gpt-5", Models: []string{"openai/gpt-5", "anthropic/claude-sonnet-4-5"}},
	}
	spec, err := testConfig(t).Spec(launch, proxyEndpoints, "")
	if err != nil {
		t.Fatal(err)
	}
	path, _ := EnvValue(spec.Env, "OPENCODE_CONFIG")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var cfg struct {
		Model    string `json:"model"`
		Provider struct {
			Plural struct {
				Models map[string]any `json:"models"`
			} `json:"plural"`
		} `json:"provider"`
	}
	if err := json.Unmarshal(data, &cfg); err != nil {
		t.Fatal(err)
	}
	if cfg.Model != "plural/openai/gpt-5" {
		t.Errorf("model = %q", cfg.Model)
	}
	if _, ok := cfg.Provider.Plural.Models["anthropic/claude-sonnet-4-5"]; !ok || len(cfg.Provider.Plural.Models) != 2 {
		t.Errorf("models = %v", cfg.Provider.Plural.Models)
	}
}

func TestGeminiDropsTheProviderPrefix(t *testing.T) {
	launch := &devboxv1.AgentLaunch{
		Agent:       devboxv1.AgentType_AGENT_TYPE_GEMINI,
		ProxyModels: &devboxv1.ProxyModels{DefaultModel: "vertex/gemini-2.5-pro"},
	}
	spec, err := testConfig(t).Spec(launch, proxyEndpoints, "")
	if err != nil {
		t.Fatal(err)
	}
	if i := slices.Index(spec.Args, "--model"); i < 0 || spec.Args[i+1] != "gemini-2.5-pro" {
		t.Errorf("args = %v", spec.Args)
	}
}

func TestModelIDsMatchEachPicker(t *testing.T) {
	for _, tc := range []struct {
		agent devboxv1.AgentType
		model string
		want  []string
	}{
		{devboxv1.AgentType_AGENT_TYPE_CLAUDE, "anthropic/claude-opus-4-1", []string{"anthropic/claude-opus-4-1"}},
		{devboxv1.AgentType_AGENT_TYPE_CODEX, "gpt-5", []string{"gpt-5", "openai/gpt-5"}},
		{devboxv1.AgentType_AGENT_TYPE_OPENCODE, "openai/gpt-5", []string{"openai/gpt-5", "plural/openai/gpt-5"}},
		{devboxv1.AgentType_AGENT_TYPE_PI, "anthropic/claude-sonnet-4-5", []string{"anthropic/claude-sonnet-4-5", "plural/anthropic/claude-sonnet-4-5"}},
		{devboxv1.AgentType_AGENT_TYPE_PI, "plural/openai/gpt-5", []string{"plural/openai/gpt-5"}},
		{devboxv1.AgentType_AGENT_TYPE_GEMINI, "vertex/gemini-2.5-pro", []string{"vertex/gemini-2.5-pro", "gemini-2.5-pro"}},
	} {
		if got := ModelIDs(tc.agent, tc.model); !slices.Equal(got, tc.want) {
			t.Errorf("ModelIDs(%s, %q) = %v, want %v", tc.agent, tc.model, got, tc.want)
		}
	}
}

func TestHeadlessUsesSubscriptionCredentials(t *testing.T) {
	c := &Config{Home: "/home/dev", BaseEnv: func() []string {
		return []string{"ANTHROPIC_BASE_URL=https://proxy", "OPENAI_API_KEY=x", "PATH=/bin"}
	}}
	path, args, env, err := c.Headless(devboxv1.AgentType_AGENT_TYPE_CLAUDE, "write it", "/tmp/out")
	if err != nil || path != "claude" || args[0] != "-p" || args[1] != "write it" {
		t.Fatalf("claude headless = %s %v, %v", path, args, err)
	}
	if v, _ := EnvValue(env, "CLAUDE_CODE_OAUTH_TOKEN"); v != ClaudeOAuthPlaceholder {
		t.Fatalf("claude env lacks the OAuth placeholder: %v", env)
	}
	if _, ok := EnvValue(env, "ANTHROPIC_BASE_URL"); ok {
		t.Fatalf("claude headless must not use the proxy: %v", env)
	}

	path, args, env, err = c.Headless(devboxv1.AgentType_AGENT_TYPE_CODEX, "write it", "/tmp/out")
	if err != nil || path != "codex" || args[0] != "exec" || !slices.Contains(args, "/tmp/out") || args[len(args)-1] != "write it" {
		t.Fatalf("codex headless = %s %v, %v", path, args, err)
	}
	if v, _ := EnvValue(env, "CODEX_HOME"); v != "/home/dev/.codex" {
		t.Fatalf("codex env %v", env)
	}
	if _, ok := EnvValue(env, "OPENAI_API_KEY"); ok {
		t.Fatalf("codex headless must not use an API key: %v", env)
	}

	if _, _, _, err := c.Headless(devboxv1.AgentType_AGENT_TYPE_GEMINI, "x", ""); err == nil {
		t.Fatal("gemini has no headless mode")
	}
}
