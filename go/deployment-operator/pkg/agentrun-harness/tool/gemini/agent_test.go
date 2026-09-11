package gemini

import (
	"context"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/pelletier/go-toml/v2"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func TestAgentPrepareWritesPromptAndSkills(t *testing.T) {
	useGeminiSystemTemplates(t)
	workDir := t.TempDir()
	run := geminiTestRun(console.AgentRunModeAnalyze, "", nil)
	run.Skills = []agentrunv1.AgentSkill{{Name: "repository", Contents: "Use the repository guidance."}}
	agent := NewAgent(toolv1.Config{Run: run})
	request := toolv1.FileSystemRequest{Phase: toolv1.ConfigurePhaseInitial, WorkDir: workDir, RepositoryDir: t.TempDir()}
	if err := agent.Prepare(context.Background(), request); err != nil {
		t.Fatalf("Prepare() error = %v", err)
	}
	prompt, err := os.ReadFile(filepath.Join(workDir, geminiHomeDir, toolv1.SystemPromptFile))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(string(prompt), "analyze") {
		t.Fatalf("prompt = %q", prompt)
	}
	assertCompatibilityInstructions(t, prompt)
	if _, err := os.Stat(filepath.Join(workDir, geminiHomeDir, geminiSkillsDir, "repository", "SKILL.md")); err != nil {
		t.Fatalf("skill: %v", err)
	}
	request.Phase = toolv1.ConfigurePhaseBabysit
	if err := agent.Prepare(context.Background(), request); err != nil {
		t.Fatalf("Prepare(babysit) error = %v", err)
	}
	prompt, err = os.ReadFile(filepath.Join(workDir, geminiHomeDir, toolv1.SystemPromptFile))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(string(prompt), "babysit") {
		t.Fatalf("babysit prompt = %q", prompt)
	}
	assertCompatibilityInstructions(t, prompt)
}

func TestAgentConfigureWritesSettingsAndPolicy(t *testing.T) {
	workDir := t.TempDir()
	homePath := filepath.Join(workDir, geminiHomeDir)
	policyDir := filepath.Join(homePath, "policies")
	policyPath := filepath.Join(policyDir, "plural-harness.toml")
	if err := os.MkdirAll(policyDir, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(homePath, SettingsFileName), []byte("old settings"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(policyPath, []byte("old policy"), 0644); err != nil {
		t.Fatal(err)
	}

	run := geminiTestRun(console.AgentRunModeReview, "", nil)
	agent := NewAgent(toolv1.Config{WorkDir: workDir, RepositoryDir: "/repo", Run: run})
	if err := agent.Configure(context.Background(), toolv1.ConfigureRequest{Phase: toolv1.ConfigurePhaseInitial}); err != nil {
		t.Fatalf("Configure() error = %v", err)
	}
	settings, err := os.ReadFile(filepath.Join(homePath, SettingsFileName))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(settings), defaultModel) || strings.Contains(string(settings), "WriteFileTool") {
		t.Fatalf("settings = %s", settings)
	}
	assertFileMode(t, homePath, 0700)
	assertFileMode(t, filepath.Join(homePath, SettingsFileName), 0600)
	policyContent, err := os.ReadFile(policyPath)
	if err != nil {
		t.Fatalf("read Gemini user policy: %v", err)
	}
	assertFileMode(t, policyDir, 0700)
	assertFileMode(t, policyPath, 0600)

	var policy struct {
		Rules []struct {
			ToolName      string `toml:"toolName"`
			CommandPrefix string `toml:"commandPrefix"`
			CommandRegex  string `toml:"commandRegex"`
			Decision      string `toml:"decision"`
			Priority      int    `toml:"priority"`
			DenyMessage   string `toml:"denyMessage"`
		} `toml:"rule"`
	}
	if err := toml.Unmarshal(policyContent, &policy); err != nil {
		t.Fatalf("parse Gemini user policy: %v", err)
	}

	var foundUpdateTopic, foundRecursiveDelete, foundEnvironmentEnumeration bool
	for _, rule := range policy.Rules {
		if rule.Decision != "deny" || rule.Priority <= 0 || rule.DenyMessage == "" {
			t.Errorf("unsafe or incomplete Gemini policy rule: %#v", rule)
		}
		switch {
		case rule.ToolName == "update_topic":
			foundUpdateTopic = true
		case rule.ToolName == "run_shell_command" && rule.CommandPrefix == "rm -rf":
			foundRecursiveDelete = true
		case rule.ToolName == "run_shell_command" && rule.CommandRegex != "":
			foundEnvironmentEnumeration = true
			assertEnvironmentEnumerationRegex(t, rule.CommandRegex)
		}
	}
	if !foundUpdateTopic || !foundRecursiveDelete || !foundEnvironmentEnumeration {
		t.Fatalf("Gemini policy rules missing: update_topic=%t rm-rf=%t environment=%t\n%s",
			foundUpdateTopic, foundRecursiveDelete, foundEnvironmentEnumeration, policyContent)
	}
}

func TestAgentConfigureCapturesProxyCredentialsWithoutSettingsLeak(t *testing.T) {
	workDir := t.TempDir()
	run := geminiTestRun(console.AgentRunModeReview, "gemini-custom", nil)
	run.Runtime.AiProxy = true
	agent := NewAgent(toolv1.Config{WorkDir: workDir, RepositoryDir: "/repo", Run: run})
	if err := agent.Configure(context.Background(), toolv1.ConfigureRequest{
		Phase:        toolv1.ConfigurePhaseInitial,
		ConsoleURL:   "https://console.example",
		ConsoleToken: "console-token",
		Settings:     toolv1.Settings{Model: toolv1.ModelSelection{Name: "vertex/gemini-custom"}},
	}); err != nil {
		t.Fatalf("Configure() error = %v", err)
	}
	if agent.consoleURL != "https://console.example" || agent.consoleToken != "console-token" {
		t.Fatalf("proxy credentials were not captured: url=%q token=%q", agent.consoleURL, agent.consoleToken)
	}
	settings, err := os.ReadFile(filepath.Join(workDir, geminiHomeDir, SettingsFileName))
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(settings), "console-token") {
		t.Fatalf("native settings exposed Console token: %s", settings)
	}
}

func TestAgentExportStagesChats(t *testing.T) {
	workDir := t.TempDir()
	chatDir := filepath.Join(workDir, geminiHomeDir, "tmp", "plural", geminiChatsDir)
	if err := os.MkdirAll(chatDir, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(chatDir, "chat.json"), []byte("chat"), 0644); err != nil {
		t.Fatal(err)
	}
	agent := NewAgent(toolv1.Config{WorkDir: workDir, RepositoryDir: t.TempDir(), Run: geminiTestRun(console.AgentRunModeWrite, "", nil)})
	output := t.TempDir()
	result, err := agent.Export(context.Background(), toolv1.ExportRequest{SessionID: "session-1", OutputDir: output})
	if err != nil {
		t.Fatalf("Export() error = %v", err)
	}
	if result.SessionSource.Path != output || result.SessionSource.ArchivePath != geminiChatsDir {
		t.Fatalf("session source = %#v", result.SessionSource)
	}
	content, err := os.ReadFile(filepath.Join(output, "chat.json"))
	if err != nil || string(content) != "chat" {
		t.Fatalf("staged chat = %q, %v", content, err)
	}
}

func geminiTestRun(mode console.AgentRunMode, model string, endpoint *string) *agentrunv1.AgentRun {
	return &agentrunv1.AgentRun{Mode: mode, Runtime: &agentrunv1.AgentRuntime{Config: &agentrunv1.AgentRuntimeConfig{
		Gemini: &agentrunv1.GeminiConfig{APIKey: "api-key", Model: model, Timeout: time.Minute, InactivityTimeout: time.Second, Endpoint: endpoint},
	}}}
}

func useGeminiSystemTemplates(t *testing.T) {
	t.Helper()
	root := t.TempDir()
	if err := os.Mkdir(filepath.Join(root, "system"), 0755); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"analyze", "write", "review", "babysit"} {
		if err := os.WriteFile(filepath.Join(root, "system", name+".md.tmpl"), []byte(name+" {{.Prompt}}"), 0644); err != nil {
			t.Fatal(err)
		}
	}
	t.Chdir(root)
}

func assertCompatibilityInstructions(t *testing.T, prompt []byte) {
	t.Helper()
	for _, required := range []string{
		"command substitution",
		"temporary files",
		"http://127.0.0.1:8080/mcp",
		"bare GET",
		"long-lived",
		"--max-time 5",
		"broad environment",
		"secret values",
		"named non-secret",
	} {
		if !strings.Contains(string(prompt), required) {
			t.Fatalf("Gemini compatibility instructions missing %q: %q", required, prompt)
		}
	}
}

func assertFileMode(t *testing.T, path string, want os.FileMode) {
	t.Helper()
	info, err := os.Stat(path)
	if err != nil {
		t.Fatal(err)
	}
	if got := info.Mode().Perm(); got != want {
		t.Errorf("%s mode = %04o, want %04o", path, got, want)
	}
}

func assertEnvironmentEnumerationRegex(t *testing.T, pattern string) {
	t.Helper()
	compiled, err := regexp.Compile(pattern)
	if err != nil {
		t.Fatalf("compile environment enumeration commandRegex: %v", err)
	}
	for _, command := range []string{
		"env",
		"env -0",
		"env -u FOO",
		"env -u FOO BAR=value",
		"env FOO=value",
		`env FOO="bar baz"`,
		`env FOO=bar\ baz`,
		"FOO=bar env",
		"PATH=/usr/bin printenv",
		`FOO="bar baz" env`,
		`FOO=bar\ baz env`,
		"FOO=bar PATH=/usr/bin printenv",
		"env # inspect environment",
		"printenv # inspect environment",
		"(env)",
		"(printenv)",
		"exec env",
		"exec printenv",
		"/usr/bin/env --null",
		"command env | sort",
		"env 2> /tmp/environment",
		"printenv",
		"printenv > /tmp/environment",
		"builtin set | cat",
		"export -p",
		"export -p > /tmp/environment",
	} {
		match := compiled.FindStringIndex(policyCommandSubject(command))
		if match == nil || match[0] != 0 {
			t.Errorf("environment enumeration commandRegex does not match %q", command)
		}
	}
	for _, command := range []string{
		"env FOO=bar command",
		`env FOO="bar baz" command`,
		`env FOO=bar\ baz command`,
		"env -u FOO command",
		"printenv PATH",
		"printenv --null PATH",
		"set -o",
		"export -p PATH",
		"FOO=bar",
		`FOO="bar baz"`,
		`FOO=bar\ baz`,
		"FOO=bar git status",
		`FOO="bar baz" git status`,
		`FOO=bar\ baz git status`,
	} {
		match := compiled.FindStringIndex(policyCommandSubject(command))
		if match != nil && match[0] == 0 {
			t.Errorf("environment enumeration commandRegex unexpectedly matches %q", command)
		}
	}
}

func policyCommandSubject(command string) string {
	return strconv.Quote(command)[1:] + "}"
}
