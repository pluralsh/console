package codex

// ConfigTemplateInput contains the native Codex settings that vary per run.
// Slices replace maps so templates can preserve a deterministic order while
// still representing Codex's map-shaped TOML sections.
type ConfigTemplateInput struct {
	RepositoryDir string
	Profile       configTemplateProfile
	Providers     []configTemplateProvider
	MCPServers    []configTemplateMCP
}

type configTemplateProfile struct {
	Name                   string
	Model                  string
	ModelProvider          string
	SandboxMode            string
	ApprovalPolicy         string
	ModelReasoningEffort   string
	ShellEnvironmentPolicy *configTemplateShellEnvironmentPolicy
	EnableWebSearch        bool
	EnableShellCache       bool
	ModelInstructionsFile  string
}

type configTemplateShellEnvironmentPolicy struct {
	IncludeOnly []string
	Set         []configTemplateKeyValue
}

type configTemplateProvider struct {
	Name    string
	BaseURL string
	EnvKey  string
	WireAPI string
}

type configTemplateMCP struct {
	Name           string
	Type           string
	URL            string
	Command        string
	Args           []string
	Env            []configTemplateKeyValue
	Headers        []configTemplateKeyValue
	HTTPHeaders    []configTemplateKeyValue
	EnvHTTPHeaders []configTemplateKeyValue
	EnabledTools   []string
	DisabledTools  []string
	TrustPolicy    string
}

type configTemplateKeyValue struct {
	Key   string
	Value string
}
