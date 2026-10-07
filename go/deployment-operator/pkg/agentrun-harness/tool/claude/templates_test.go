package claude

import (
	"encoding/json"
	"reflect"
	"testing"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/mcp"
)

type renderedSettings struct {
	Model                      string  `json:"model"`
	Temperature                float64 `json:"temperature"`
	EnableAllProjectMCPServers bool    `json:"enableAllProjectMcpServers"`
	Permissions                struct {
		Allow []string `json:"allow"`
		Deny  []string `json:"deny"`
	} `json:"permissions"`
	Env             map[string]string `json:"env"`
	AvailableModels []string          `json:"availableModels"`
}

func TestSettingsTemplate(t *testing.T) {
	model := "vendor\\model\n\"name\a\v"
	externalServer := mcp.Server{
		Name:         "external\"server",
		AllowedTools: []string{"tool\nname"},
	}
	wildcardServer := mcp.Server{Name: "wildcard\tserver"}
	externalTool := "mcp__external\"server__tool\nname"
	wildcardTool := "mcp__wildcard\tserver__*"
	tests := []struct {
		name      string
		readOnly  bool
		wantAllow []string
		wantDeny  []string
	}{
		{
			name:     "read only",
			readOnly: true,
			wantAllow: []string{
				"Read", "Grep", "Glob", "Bash(ls:*)", "Bash(cd:*)", "Bash(pwd)",
				"Bash(git status)", "Bash(git diff:*)", "Bash(git branch:*)", "Bash(git log:*)",
				"Bash(git show:*)", "Bash(git merge-base:*)", "Bash(git rev-parse:*)",
				"Bash(head:*)", "Bash(tail:*)", "Bash(cat:*)", "Bash(grep:*)", "Bash(rg:*)",
				"Bash(find:*)", "WebFetch", "mcp__plural__*", "mcp__codebase-memory-mcp__*", externalTool, wildcardTool,
			},
			wantDeny: []string{"Edit", "Write", "Bash(rm:*)", "Bash(sudo:*)"},
		},
		{
			name:     "write",
			readOnly: false,
			wantAllow: []string{
				"Read", "Write", "Edit", "MultiEdit", "Bash", "WebFetch",
				"mcp__plural__*", "mcp__codebase-memory-mcp__*", externalTool, wildcardTool,
			},
			wantDeny: []string{},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			settings := renderSettingsTemplate(t, &settingsTemplateInput{
				Model:                model,
				BashDefaultTimeoutMS: "1000\n\"milliseconds\"",
				BashMaxTimeoutMS:     "2000\tmilliseconds",
				ExternalMCPServers:   []mcp.Server{externalServer, wildcardServer},
				ReadOnly:             test.readOnly,
			})

			if settings.Model != model || settings.Temperature != 0.1 || !settings.EnableAllProjectMCPServers {
				t.Fatalf("settings = %#v", settings)
			}
			if !reflect.DeepEqual(settings.Permissions.Allow, test.wantAllow) || !reflect.DeepEqual(settings.Permissions.Deny, test.wantDeny) {
				t.Fatalf("permissions = %#v", settings.Permissions)
			}
			if settings.Env["BASH_DEFAULT_TIMEOUT_MS"] != "1000\n\"milliseconds\"" || settings.Env["BASH_MAX_TIMEOUT_MS"] != "2000\tmilliseconds" {
				t.Fatalf("env = %#v", settings.Env)
			}
			if !reflect.DeepEqual(settings.AvailableModels, []string{model}) {
				t.Fatalf("availableModels = %#v", settings.AvailableModels)
			}
		})
	}
}

func renderSettingsTemplate(t *testing.T, input *settingsTemplateInput) renderedSettings {
	t.Helper()
	content, err := settingsTemplate(input)
	if err != nil {
		t.Fatalf("settingsTemplate() error = %v", err)
	}
	var settings renderedSettings
	if err := json.Unmarshal([]byte(content), &settings); err != nil {
		t.Fatalf("parse rendered JSON: %v\n%s", err, content)
	}
	return settings
}
