// Package harness builds the launch configuration for each agent harness (DBX-46, DBX-57): the ACP command,
// environment pointing model traffic at the console AI proxy with a placeholder key (or at the owner's plan),
// CA trust, home instruction files and the per-harness model boot flags used when an adapter has no ACP model
// control. Models are set over ACP; config files only get the defaults and model lists harnesses can't take any
// other way (Claude's availableModels, Codex's provider, catalog and default model).
package harness

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strings"

	"github.com/pelletier/go-toml/v2"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/acp"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/internal/fsutil"
)

// PlaceholderKey is the API key harnesses send; atenet-egress replaces the auth header with the instance's AI
// proxy token, so the real token never enters the sandbox.
const PlaceholderKey = "plural-devbox-placeholder"

// ClaudeOAuthPlaceholder has the real `sk-ant-oat01-` prefix, so Claude Code accepts it; egress swaps in the
// owner's token for api.anthropic.com (section 4.11).
const ClaudeOAuthPlaceholder = "sk-ant-oat01-plural-devbox-placeholder"

// ImageAgent is one agent entry in /etc/devbox/image.json, written by the devbox image build (DBX-49).
type ImageAgent struct {
	Command string `json:"command"`
	Version string `json:"version"`
	ACP     struct {
		Command string   `json:"command"`
		Args    []string `json:"args"`
		Version string   `json:"version"`
	} `json:"acp"`
}

// ImageInfo is /etc/devbox/image.json.
type ImageInfo struct {
	Contract      string                `json:"contract"`
	Flavor        string                `json:"flavor"`
	DaemonVersion string                `json:"daemonVersion"`
	PlaywrightMCP string                `json:"playwrightMcp"`
	Agents        map[string]ImageAgent `json:"agents"`
}

// LoadImageInfo reads the image description. A missing file yields built-in defaults.
func LoadImageInfo(path string) (*ImageInfo, error) {
	info := &ImageInfo{}
	data, err := os.ReadFile(path)
	if errors.Is(err, fs.ErrNotExist) {
		return info, nil
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(data, info); err != nil {
		return nil, fmt.Errorf("decode %s: %w", path, err)
	}
	return info, nil
}

// AgentName is the lowercase name used in image.json and CRDs.
func AgentName(t devboxv1.AgentType) string {
	return strings.ToLower(strings.TrimPrefix(t.String(), "AGENT_TYPE_"))
}

// ParseAgent parses an agent name ("claude", "AGENT_TYPE_CLAUDE").
func ParseAgent(s string) (devboxv1.AgentType, bool) {
	s = strings.ToUpper(strings.TrimSpace(s))
	if !strings.HasPrefix(s, "AGENT_TYPE_") {
		s = "AGENT_TYPE_" + s
	}
	v, ok := devboxv1.AgentType_value[s]
	return devboxv1.AgentType(v), ok && v != 0
}

// AllAgents lists the supported harnesses.
var AllAgents = []devboxv1.AgentType{
	devboxv1.AgentType_AGENT_TYPE_CLAUDE, devboxv1.AgentType_AGENT_TYPE_CODEX, devboxv1.AgentType_AGENT_TYPE_OPENCODE,
	devboxv1.AgentType_AGENT_TYPE_GEMINI, devboxv1.AgentType_AGENT_TYPE_PI,
}

type agentDefaults struct {
	command string
	args    []string
	// binary is the harness CLI itself (used for `codex login` and presence checks).
	binary string
	// modelArg/modelEnv pass the model at boot for adapters without ACP model control.
	modelArg string
	modelEnv string
	// proxyProvider is the AI proxy provider prefix for bare model names (pkg/agentrun-harness/model/proxy.go).
	proxyProvider string
	lineage       acp.LineageExtractor
	// v2 is whether the pinned adapter can negotiate ACP v2 (section 4.6a); only used with the box's acpV2 flag.
	v2 bool
	// nativeSubagents is whether the adapter streams each subagent as its own session (subagent_spawned). Without
	// the client capability, claude-agent-acp drops subagent messages and only tags their tool calls, and codex-acp
	// folds every child thread's events (and approvals) into the root session unmarked.
	nativeSubagents bool
}

var defaults = map[devboxv1.AgentType]agentDefaults{
	devboxv1.AgentType_AGENT_TYPE_CLAUDE:   {command: "claude-agent-acp", binary: "claude", modelEnv: "ANTHROPIC_MODEL", proxyProvider: "anthropic", lineage: acp.ClaudeLineage, v2: true, nativeSubagents: true},
	devboxv1.AgentType_AGENT_TYPE_CODEX:    {command: "codex-acp", binary: "codex", proxyProvider: "openai", lineage: acp.NoLineage{}, v2: true, nativeSubagents: true},
	devboxv1.AgentType_AGENT_TYPE_OPENCODE: {command: "opencode", args: []string{"acp"}, binary: "opencode", proxyProvider: "openai", lineage: acp.NoLineage{}},
	devboxv1.AgentType_AGENT_TYPE_GEMINI:   {command: "gemini", args: []string{"--experimental-acp"}, binary: "gemini", modelArg: "--model", proxyProvider: "vertex", lineage: acp.NoLineage{}},
	devboxv1.AgentType_AGENT_TYPE_PI:       {command: "pi-acp", binary: "pi", proxyProvider: "openai", lineage: acp.NoLineage{}},
}

// Command overrides an agent's ACP command (tests and custom images).
type Command struct {
	Path string
	Args []string
	Env  []string
}

// Config is the harness configuration shared by every agent.
type Config struct {
	Home string
	// StateDir is ~/.plural; daemon-managed harness config lives under StateDir/harness.
	StateDir string
	Image    *ImageInfo
	// AgentAuthDir is the tmpfs for subscription credentials (/run/plural/agent-auth).
	AgentAuthDir string
	// BaseEnv returns the environment every child process gets (CA trust, identity, PATH, ...).
	BaseEnv func() []string
	// Overrides replace the ACP command per agent.
	Overrides map[devboxv1.AgentType]Command
	// CodexBundledModels returns Codex's bundled model catalog; it defaults to `codex debug models --bundled`.
	CodexBundledModels func() ([]byte, error)
}

// Spec is everything needed to start one agent's ACP process.
type Spec struct {
	Agent   devboxv1.AgentType
	Path    string
	Args    []string
	Env     []string
	Dir     string
	Lineage acp.LineageExtractor
	// RequestV2 asks for protocol version 2 at initialize (acpV2 flag and adapter support).
	RequestV2 bool
	// NativeSubagents advertises the subagents client capability at initialize.
	NativeSubagents bool
	// BootModel is the model passed through flags/env, for adapters without ACP model control.
	BootModel string
	Billing   devboxv1.BillingMode
	// AuthMethodID, when set, is sent with `authenticate` after initialize.
	AuthMethodID string
}

// Binary returns the harness CLI for an agent (claude, codex, ...).
func Binary(t devboxv1.AgentType) string { return defaults[t].binary }

// CodexHome is where Codex keeps its state (sessions, config) on the workspace volume.
func (c *Config) CodexHome() string { return filepath.Join(c.Home, ".codex") }

// CodexAuthDir is the tmpfs CODEX_HOME holding auth.json for subscription billing.
func (c *Config) CodexAuthDir() string { return filepath.Join(c.AgentAuthDir, "codex") }

// Present reports whether the agent's ACP command is on PATH.
func (c *Config) Present(t devboxv1.AgentType) (string, bool) {
	path, _ := c.command(t)
	if filepath.IsAbs(path) {
		_, err := os.Stat(path)
		return path, err == nil
	}
	p, err := exec.LookPath(path)
	return p, err == nil
}

// AdapterVersion is the pinned adapter version from image.json, if known.
func (c *Config) AdapterVersion(t devboxv1.AgentType) string {
	if c.Image == nil {
		return ""
	}
	a := c.Image.Agents[AgentName(t)]
	if a.ACP.Version != "" {
		return a.ACP.Version
	}
	return a.Version
}

func (c *Config) command(t devboxv1.AgentType) (string, []string) {
	if o, ok := c.Overrides[t]; ok {
		return o.Path, o.Args
	}
	if c.Image != nil {
		if a, ok := c.Image.Agents[AgentName(t)]; ok && a.ACP.Command != "" {
			return a.ACP.Command, a.ACP.Args
		}
	}
	d := defaults[t]
	return d.command, d.args
}

// ProxyModel prefixes a bare model with the AI proxy provider, as the agent-run harness does.
func ProxyModel(t devboxv1.AgentType, model string) string {
	model = strings.TrimSpace(model)
	if model == "" || strings.Contains(model, "/") {
		return model
	}
	if p := defaults[t].proxyProvider; p != "" {
		return p + "/" + model
	}
	return model
}

// ModelIDs are the IDs an agent's picker may list a console model under, most specific first: the ID itself, a
// bare model under the agent's proxy provider, the `plural/` provider OpenCode and Pi register the proxy models
// under, and Gemini CLI's bare names.
func ModelIDs(t devboxv1.AgentType, model string) []string {
	model = strings.TrimSpace(model)
	ids := []string{model}
	add := func(id string) {
		if id != "" && !slices.Contains(ids, id) {
			ids = append(ids, id)
		}
	}
	add(ProxyModel(t, model))
	switch t {
	case devboxv1.AgentType_AGENT_TYPE_OPENCODE, devboxv1.AgentType_AGENT_TYPE_PI:
		if strings.Contains(model, "/") && !strings.HasPrefix(model, "plural/") {
			add("plural/" + model)
		}
	case devboxv1.AgentType_AGENT_TYPE_GEMINI:
		add(strings.TrimPrefix(model, defaults[t].proxyProvider+"/"))
	}
	return ids
}

// Spec builds the launch spec for one agent connection.
func (c *Config) Spec(launch *devboxv1.AgentLaunch, endpoints *devboxv1.HarnessEndpoints, bootModel string) (*Spec, error) {
	t := launch.GetAgent()
	d, ok := defaults[t]
	if !ok {
		return nil, fmt.Errorf("unsupported agent %s", t)
	}
	path, args := c.command(t)
	billing := launch.GetBilling()
	if billing == devboxv1.BillingMode_BILLING_MODE_UNSPECIFIED {
		billing = devboxv1.BillingMode_BILLING_MODE_PROXY
	}
	spec := &Spec{
		Agent: t, Path: path, Args: append([]string(nil), args...), Dir: c.Home, Lineage: d.lineage,
		RequestV2: launch.GetAcpV2() && d.v2, NativeSubagents: d.nativeSubagents, BootModel: bootModel, Billing: billing,
	}
	env := c.baseEnv()
	aiProxy := strings.TrimSuffix(endpoints.GetAiProxyUrl(), "/")
	subscription := billing == devboxv1.BillingMode_BILLING_MODE_SUBSCRIPTION
	var proxyModels *devboxv1.ProxyModels
	if !subscription && aiProxy != "" {
		proxyModels = launch.GetProxyModels()
	}
	// the box's model wins; otherwise the proxy's default, so harnesses never fall back to a model it doesn't serve
	model := bootModel
	if model == "" {
		model = proxyModels.GetDefaultModel()
	}
	set := func(kv ...string) {
		for i := 0; i+1 < len(kv); i += 2 {
			env = setEnv(env, kv[i], kv[i+1])
		}
	}
	switch t {
	case devboxv1.AgentType_AGENT_TYPE_CLAUDE:
		env = unsetEnv(env, append([]string{"ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_BASE_URL", "CLAUDE_CODE_OAUTH_TOKEN"}, claudeTierEnv...)...)
		if err := c.claudeSpec(set, d, subscription, aiProxy, bootModel, proxyModels); err != nil {
			return nil, err
		}
	case devboxv1.AgentType_AGENT_TYPE_CODEX:
		env = unsetEnv(env, "OPENAI_API_KEY", "CODEX_API_KEY", "DEFAULT_AUTH_REQUEST", "CODEX_CONFIG", "MODEL_PROVIDER")
		if err := c.codexSpec(set, d, subscription, aiProxy, model, proxyModels); err != nil {
			return nil, err
		}
	case devboxv1.AgentType_AGENT_TYPE_OPENCODE:
		cfg, err := c.writeOpenCodeConfig(aiProxy, model, proxyModels.GetModels())
		if err != nil {
			return nil, err
		}
		set("OPENCODE_CONFIG", cfg)
	case devboxv1.AgentType_AGENT_TYPE_GEMINI:
		set("GEMINI_CLI_TRUST_WORKSPACE", "true")
		if aiProxy != "" {
			set("GEMINI_API_KEY", PlaceholderKey, "GOOGLE_GEMINI_BASE_URL", aiProxy+"/gemini")
		}
		// the proxy's Gemini route takes the model from a URL path segment, so it can't carry a provider prefix
		if model = strings.TrimPrefix(model, "vertex/"); model != "" {
			spec.Args = append(spec.Args, d.modelArg, model)
		}
	case devboxv1.AgentType_AGENT_TYPE_PI:
		// Pi reads custom endpoints from models.json, not the environment; the model is set over ACP
		if err := c.syncPiProvider(aiProxy, proxyModels.GetModels()); err != nil {
			return nil, err
		}
	}
	if o, ok := c.Overrides[t]; ok {
		env = append(env, o.Env...)
	}
	spec.Env = env
	return spec, nil
}

// claudeSpec sets Claude Code's environment and syncs its model list.
func (c *Config) claudeSpec(set func(kv ...string), d agentDefaults, subscription bool, aiProxy, bootModel string, proxyModels *devboxv1.ProxyModels) error {
	set("CLAUDE_CONFIG_DIR", filepath.Join(c.Home, ".claude"), "DISABLE_AUTOUPDATER", "1")
	if subscription {
		set("CLAUDE_CODE_OAUTH_TOKEN", ClaudeOAuthPlaceholder)
	} else if aiProxy != "" {
		set("ANTHROPIC_BASE_URL", aiProxy+"/anthropic", "ANTHROPIC_AUTH_TOKEN", PlaceholderKey)
	}
	// Claude Code picks models by tier alias (including for background work), so each tier is pinned to a
	// proxy model; ANTHROPIC_MODEL stays the box's choice so the session's model picker keeps working.
	aliases := proxyModels.GetAliases()
	for tier, key := range claudeTiers {
		if m := aliases[tier]; m != "" {
			set(key, m)
		}
	}
	if m := aliases["haiku"]; m != "" {
		set("ANTHROPIC_SMALL_FAST_MODEL", m)
	}
	if bootModel != "" {
		set(d.modelEnv, bootModel)
	}
	return c.syncClaudeAvailableModels(proxyModels.GetModels())
}

// codexSpec sets Codex's environment and syncs its config.toml.
func (c *Config) codexSpec(set func(kv ...string), d agentDefaults, subscription bool, aiProxy, model string, proxyModels *devboxv1.ProxyModels) error {
	set("CODEX_HOME", c.CodexHome(), "NO_BROWSER", "1")
	// codex-acp otherwise runs the Codex bundled with it, whose models needn't match the image's catalog
	if path, err := exec.LookPath(d.binary); err == nil {
		set("CODEX_PATH", path)
	}
	want := map[string]any{}
	if subscription {
		// auth.json is a symlink into the tmpfs; keep Codex off the OS keyring so it reads and rewrites it.
		want["cli_auth_credentials_store"] = "file"
	} else if aiProxy != "" {
		set("CODEX_API_KEY", PlaceholderKey, "DEFAULT_AUTH_REQUEST", `{"methodId":"api-key"}`)
		want["model_provider"] = codexProvider
		want["model_providers."+codexProvider] = map[string]any{
			"name": codexProvider, "base_url": aiProxy + "/v1", "env_key": "CODEX_API_KEY", "wire_api": "responses",
			"supports_websockets": false,
		}
		catalog, err := c.writeCodexCatalog(proxyModels.GetModels())
		if err != nil {
			return err
		}
		if catalog != "" {
			want["model_catalog_json"] = catalog
		}
	}
	if model != "" {
		want["model"] = model
	}
	return c.syncCodexConfig(want)
}

// Headless is the command line for a one-off, non-interactive prompt to a subscription agent's CLI, run with the
// credentials its ACP process gets. The CLI may read the working directory but not change it. lastMessage is a
// file Codex writes its final answer to; Claude prints a JSON result instead.
func (c *Config) Headless(t devboxv1.AgentType, prompt, lastMessage string) (path string, args, env []string, err error) {
	env = c.baseEnv()
	switch t {
	case devboxv1.AgentType_AGENT_TYPE_CLAUDE:
		env = unsetEnv(env, append([]string{"ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_BASE_URL"}, claudeTierEnv...)...)
		env = setEnv(env, "CLAUDE_CONFIG_DIR", filepath.Join(c.Home, ".claude"))
		env = setEnv(env, "DISABLE_AUTOUPDATER", "1")
		env = setEnv(env, "CLAUDE_CODE_OAUTH_TOKEN", ClaudeOAuthPlaceholder)
		return Binary(t), []string{"-p", prompt, "--output-format", "json", "--allowedTools", "Read,Grep,Glob", "--max-turns", "8"}, env, nil
	case devboxv1.AgentType_AGENT_TYPE_CODEX:
		env = unsetEnv(env, "OPENAI_API_KEY", "CODEX_API_KEY", "DEFAULT_AUTH_REQUEST")
		env = setEnv(env, "CODEX_HOME", c.CodexHome())
		env = setEnv(env, "NO_BROWSER", "1")
		return Binary(t), []string{"exec", "--sandbox", "read-only", "--skip-git-repo-check",
			"-c", `cli_auth_credentials_store="file"`, "--output-last-message", lastMessage, prompt}, env, nil
	}
	return "", nil, nil, fmt.Errorf("%s has no headless mode", AgentName(t))
}

func (c *Config) baseEnv() []string {
	if c.BaseEnv != nil {
		return c.BaseEnv()
	}
	return os.Environ()
}

// claudeTiers are Claude Code's per-tier model overrides, keyed by alias.
var claudeTiers = map[string]string{
	"opus":   "ANTHROPIC_DEFAULT_OPUS_MODEL",
	"sonnet": "ANTHROPIC_DEFAULT_SONNET_MODEL",
	"haiku":  "ANTHROPIC_DEFAULT_HAIKU_MODEL",
}

var claudeTierEnv = []string{
	"ANTHROPIC_DEFAULT_OPUS_MODEL", "ANTHROPIC_DEFAULT_SONNET_MODEL", "ANTHROPIC_DEFAULT_HAIKU_MODEL", "ANTHROPIC_SMALL_FAST_MODEL",
}

// writeOpenCodeConfig writes the daemon-managed OpenCode config (OPENCODE_CONFIG merges with the user's own).
// The proxy's models are listed under the plural provider so OpenCode offers them.
func (c *Config) writeOpenCodeConfig(aiProxy, model string, proxyModels []string) (string, error) {
	cfg := map[string]any{
		"$schema":      "https://opencode.ai/config.json",
		"instructions": []string{filepath.Join(c.Home, "AGENTS.md")},
		// OpenCode's permissions are process-wide, so it asks for everything but reads and the daemon answers per
		// thread autonomy: forwarded to a human at manual, approved at full.
		"permission": map[string]any{
			"*": "ask", "read": "allow", "glob": "allow", "grep": "allow", "list": "allow", "todoread": "allow", "todowrite": "allow",
		},
	}
	if aiProxy != "" {
		plural := map[string]any{
			"npm":     "@ai-sdk/openai-compatible",
			"name":    "Plural AI proxy",
			"options": map[string]any{"baseURL": aiProxy + "/v1", "apiKey": PlaceholderKey},
		}
		if len(proxyModels) > 0 {
			models := make(map[string]any, len(proxyModels))
			for _, m := range proxyModels {
				models[m] = map[string]any{"name": m}
			}
			plural["models"] = models
		}
		cfg["provider"] = map[string]any{"plural": plural}
	}
	if model != "" {
		cfg["model"] = "plural/" + strings.TrimPrefix(model, "plural/")
	}
	path := filepath.Join(c.StateDir, "harness", "opencode.json")
	if err := fsutil.WriteJSON(path, cfg, 0o644); err != nil {
		return "", err
	}
	return path, nil
}

// syncClaudeAvailableModels makes Claude Code's model picker offer the proxy's models: claude-agent-acp lists
// `availableModels` from settings.json (plus Default) and passes the chosen ID verbatim to the API, which the
// proxy routes on. The list the daemon last wrote is kept beside its other harness config, so a list the user
// edited is left alone and the daemon's is removed once the box stops billing to the proxy.
func (c *Config) syncClaudeAvailableModels(models []string) error {
	settingsPath := filepath.Join(c.Home, ".claude", "settings.json")
	statePath := filepath.Join(c.StateDir, "harness", "claude-available-models.json")

	settings := map[string]any{}
	if _, err := fsutil.ReadJSON(settingsPath, &settings); err != nil {
		return err
	}
	var written []string
	if _, err := fsutil.ReadJSON(statePath, &written); err != nil {
		return err
	}
	current, present := settings["availableModels"]
	if present && !sameModels(current, written) {
		return nil
	}

	switch {
	case len(models) > 0:
		settings["availableModels"] = models
	case present:
		delete(settings, "availableModels")
	default:
		return nil
	}
	if err := fsutil.WriteJSON(settingsPath, settings, 0o644); err != nil {
		return err
	}
	return fsutil.WriteJSON(statePath, models, 0o644)
}

func sameModels(current any, written []string) bool {
	list, ok := current.([]any)
	if !ok || len(list) != len(written) {
		return false
	}
	for i, m := range list {
		if s, ok := m.(string); !ok || s != written[i] {
			return false
		}
	}
	return true
}

// writeCodexCatalog replaces Codex's model list with the proxy's models, so its picker (`model/list`) offers them.
// Each entry clones the bundled model of the same name, or a bundled one on the classic Responses API, keeping
// Codex's prompts and tool setup; the proxy routes the `provider/model` slug. Without a bundled catalog Codex keeps
// its own list.
func (c *Config) writeCodexCatalog(models []string) (string, error) {
	if len(models) == 0 {
		return "", nil
	}
	bundled := c.CodexBundledModels
	if bundled == nil {
		bundled = c.codexBundledModels
	}
	data, err := bundled()
	if err != nil {
		return "", nil
	}
	catalog, err := codexCatalog(data, models)
	if err != nil {
		return "", nil
	}
	path := filepath.Join(c.StateDir, "harness", "codex-models.json")
	if err := fsutil.WriteJSON(path, catalog, 0o644); err != nil {
		return "", err
	}
	return path, nil
}

const codexProvider = "plural"

// codexKeys are the config.toml settings the daemon manages, dotted for nested tables. Codex is configured
// through its config file rather than `-c` flags because ACP adapters start `codex app-server` themselves and
// don't pass flags on; every Codex in the box (the adapter's, a terminal's) reads the file. Codex's `model` is
// only a default: one the user changed since the daemon wrote it is theirs.
var codexKeys = []struct {
	key  string
	soft bool
}{
	{key: "model_provider"}, {key: "model_providers." + codexProvider}, {key: "model_catalog_json"},
	{key: "cli_auth_credentials_store"}, {key: "model", soft: true},
}

// syncCodexConfig sets the managed keys in want and removes the others it wrote, leaving the rest of the file
// alone. What it last wrote is kept beside its other harness config.
func (c *Config) syncCodexConfig(want map[string]any) error {
	path := filepath.Join(c.CodexHome(), "config.toml")
	statePath := filepath.Join(c.StateDir, "harness", "codex-config.json")

	cfg := map[string]any{}
	data, err := os.ReadFile(path)
	if err != nil && !errors.Is(err, fs.ErrNotExist) {
		return err
	}
	if err := toml.Unmarshal(data, &cfg); err != nil {
		return fmt.Errorf("decode %s: %w", path, err)
	}
	written := map[string]any{}
	if _, err := fsutil.ReadJSON(statePath, &written); err != nil {
		return err
	}

	changed := false
	for _, k := range codexKeys {
		cur, present := tomlGet(cfg, k.key)
		prev, wrote := written[k.key]
		ours := !present || (wrote && sameValue(cur, prev))
		v, wanted := want[k.key]
		switch {
		case wanted && (ours || !k.soft):
			if !present || !sameValue(cur, v) {
				tomlSet(cfg, k.key, v)
				changed = true
			}
			written[k.key] = v
		case !wanted && present && ours:
			tomlDelete(cfg, k.key)
			delete(written, k.key)
			changed = true
		default:
			delete(written, k.key)
		}
	}
	if changed {
		out, err := toml.Marshal(cfg)
		if err != nil {
			return err
		}
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			return err
		}
		if err := fsutil.WriteFileAtomic(path, out, 0o600); err != nil {
			return err
		}
	}
	return fsutil.WriteJSON(statePath, written, 0o644)
}

func tomlGet(cfg map[string]any, key string) (any, bool) {
	table, leaf := tomlTable(cfg, key, false)
	if table == nil {
		return nil, false
	}
	v, ok := table[leaf]
	return v, ok
}

func tomlSet(cfg map[string]any, key string, v any) {
	table, leaf := tomlTable(cfg, key, true)
	table[leaf] = v
}

// tomlDelete removes a key, and its table once that's empty (an empty [model_providers] after the proxy's goes).
func tomlDelete(cfg map[string]any, key string) {
	table, leaf := tomlTable(cfg, key, false)
	if table == nil {
		return
	}
	delete(table, leaf)
	if parent, _, nested := strings.Cut(key, "."); nested && len(table) == 0 {
		tomlDelete(cfg, parent)
	}
}

// tomlTable walks to the table holding a dotted key's last segment, creating tables on the way when asked.
func tomlTable(cfg map[string]any, key string, create bool) (map[string]any, string) {
	parts := strings.Split(key, ".")
	table := cfg
	for _, p := range parts[:len(parts)-1] {
		next, ok := table[p].(map[string]any)
		if !ok {
			if !create {
				return nil, ""
			}
			next = map[string]any{}
			table[p] = next
		}
		table = next
	}
	return table, parts[len(parts)-1]
}

// sameValue compares TOML and JSON decodings of the strings, booleans and tables the daemon writes.
func sameValue(a, b any) bool {
	ja, errA := json.Marshal(a)
	jb, errB := json.Marshal(b)
	return errA == nil && errB == nil && string(ja) == string(jb)
}

func (c *Config) codexBundledModels() ([]byte, error) {
	cmd := exec.Command(Binary(devboxv1.AgentType_AGENT_TYPE_CODEX), "debug", "models", "--bundled")
	cmd.Env = setEnv(c.baseEnv(), "CODEX_HOME", c.CodexHome())
	return cmd.Output()
}

func codexCatalog(bundled []byte, models []string) (map[string]any, error) {
	var doc struct {
		Models []map[string]any `json:"models"`
	}
	if err := json.Unmarshal(bundled, &doc); err != nil {
		return nil, err
	}
	if len(doc.Models) == 0 {
		return nil, errors.New("empty bundled catalog")
	}
	// the leading bundled model on the classic Responses API, which any proxied model can serve
	var fallback map[string]any
	for _, m := range doc.Models {
		classic := m["use_responses_lite"] != true && m["tool_mode"] == nil
		if classic && (fallback == nil || priority(m) < priority(fallback)) {
			fallback = m
		}
	}
	if fallback == nil {
		fallback = doc.Models[0]
	}

	out := make([]map[string]any, 0, len(models))
	for i, id := range models {
		_, bare, ok := strings.Cut(id, "/")
		if !ok {
			bare = id
		}
		tmpl := fallback
		for _, m := range doc.Models {
			if m["slug"] == bare {
				tmpl = m
				break
			}
		}
		entry := make(map[string]any, len(tmpl))
		for k, v := range tmpl {
			entry[k] = v
		}
		// priority tiers and upgrade prompts are OpenAI account features the proxy doesn't serve
		entry["slug"], entry["display_name"], entry["description"] = id, bare, ""
		entry["visibility"], entry["priority"] = "list", i
		entry["upgrade"], entry["availability_nux"] = nil, nil
		entry["service_tiers"], entry["additional_speed_tiers"] = []any{}, []any{}
		out = append(out, entry)
	}
	return map[string]any{"models": out}, nil
}

func priority(m map[string]any) float64 {
	if p, ok := m["priority"].(float64); ok {
		return p
	}
	return 1 << 30
}

// syncPiProvider registers the proxy as Pi's `plural` provider in ~/.pi/agent/models.json, so its models show up
// as `plural/<provider>/<model>`. The rest of the file is the user's; the provider is removed once the box stops
// billing to the proxy.
func (c *Config) syncPiProvider(aiProxy string, models []string) error {
	path := filepath.Join(c.Home, ".pi", "agent", "models.json")
	cfg := map[string]any{}
	exists, err := fsutil.ReadJSON(path, &cfg)
	if err != nil {
		return err
	}
	providers, _ := cfg["providers"].(map[string]any)
	if providers == nil {
		providers = map[string]any{}
	}

	if aiProxy == "" || len(models) == 0 {
		if _, ok := providers["plural"]; !ok {
			return nil
		}
		delete(providers, "plural")
	} else {
		entries := make([]any, 0, len(models))
		for _, m := range models {
			entries = append(entries, map[string]any{"id": m, "name": m})
		}
		providers["plural"] = map[string]any{
			"baseUrl": aiProxy + "/v1",
			"api":     "openai-completions",
			"apiKey":  PlaceholderKey,
			"models":  entries,
		}
	}
	if !exists && len(providers) == 0 {
		return nil
	}
	cfg["providers"] = providers
	return fsutil.WriteJSON(path, cfg, 0o644)
}

// InstructionLinks are each harness's global instruction file, symlinked to ~/AGENTS.md so the devbox
// conventions apply whatever the session's cwd.
func (c *Config) InstructionLinks() map[string]string {
	return map[string]string{
		filepath.Join(c.Home, ".claude", "CLAUDE.md"):             "claude",
		filepath.Join(c.Home, ".codex", "AGENTS.md"):              "codex",
		filepath.Join(c.Home, ".gemini", "GEMINI.md"):             "gemini",
		filepath.Join(c.Home, ".config", "opencode", "AGENTS.md"): "opencode",
		filepath.Join(c.Home, ".pi", "agent", "AGENTS.md"):        "pi",
	}
}

// LinkInstructions creates the global instruction symlinks that don't exist yet.
func (c *Config) LinkInstructions() error {
	target := filepath.Join(c.Home, "AGENTS.md")
	var errs []error
	for link := range c.InstructionLinks() {
		if _, err := os.Lstat(link); err == nil {
			continue
		}
		if err := os.MkdirAll(filepath.Dir(link), 0o755); err != nil {
			errs = append(errs, err)
			continue
		}
		if err := os.Symlink(target, link); err != nil {
			errs = append(errs, err)
		}
	}
	return errors.Join(errs...)
}

func setEnv(env []string, k, v string) []string {
	env = unsetEnv(env, k)
	return append(env, k+"="+v)
}

func unsetEnv(env []string, keys ...string) []string {
	out := env[:0:0]
	for _, kv := range env {
		drop := false
		for _, k := range keys {
			if strings.HasPrefix(kv, k+"=") {
				drop = true
				break
			}
		}
		if !drop {
			out = append(out, kv)
		}
	}
	return out
}

// EnvValue returns the value of k in env.
func EnvValue(env []string, k string) (string, bool) {
	for i := len(env) - 1; i >= 0; i-- {
		if v, ok := strings.CutPrefix(env[i], k+"="); ok {
			return v, true
		}
	}
	return "", false
}
