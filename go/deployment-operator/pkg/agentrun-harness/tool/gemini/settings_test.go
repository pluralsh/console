package gemini

import (
	"encoding/json"
	"testing"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/mcp"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
)

//nolint:gocyclo
func TestSettingsTemplate_GenerateAndVerifyContents(t *testing.T) {
	baseInput := &ConfigTemplateInput{
		Model:             "gemini-3.1-flash-lite",
		InactivityTimeout: 300,
	}

	t.Run("plural MCP server uses in-pod streamable HTTP URL", func(t *testing.T) {
		input := *baseInput
		input.AgentRunMode = console.AgentRunModeWrite

		_, content, err := settings(&input)
		if err != nil {
			t.Fatalf("settings() failed: %v", err)
		}

		var out map[string]any
		if err := json.Unmarshal([]byte(content), &out); err != nil {
			t.Fatalf("generated content is not valid JSON: %v", err)
		}

		mcpServers, ok := out["mcpServers"].(map[string]any)
		if !ok {
			t.Fatal("mcpServers missing or not an object")
		}
		plural, ok := mcpServers["plural"].(map[string]any)
		if !ok {
			t.Fatal("mcpServers.plural missing or not an object")
		}

		url, ok := plural["httpUrl"].(string)
		if !ok {
			t.Fatal("mcpServers.plural.httpUrl missing or not a string")
		}
		if url != "http://127.0.0.1:8080/mcp" {
			t.Errorf("expected mcpServers.plural.httpUrl=http://127.0.0.1:8080/mcp, got %q", url)
		}
		if _, ok := plural["url"]; ok {
			t.Fatal("mcpServers.plural unexpectedly configured with SSE url")
		}
	})

	t.Run("codebase memory MCP server uses local stdio command", func(t *testing.T) {
		input := *baseInput
		input.AgentRunMode = console.AgentRunModeWrite

		_, content, err := settings(&input)
		if err != nil {
			t.Fatalf("settings() failed: %v", err)
		}

		var out map[string]any
		if err := json.Unmarshal([]byte(content), &out); err != nil {
			t.Fatalf("generated content is not valid JSON: %v", err)
		}

		mcpServers := out["mcpServers"].(map[string]any)
		codebaseMemory := mcpServers[common.CodebaseMemoryMCPServerName].(map[string]any)
		if codebaseMemory["command"] != common.CodebaseMemoryMCPCommand {
			t.Fatalf("expected command %q, got %v", common.CodebaseMemoryMCPCommand, codebaseMemory["command"])
		}
		env := codebaseMemory["env"].(map[string]any)
		if env[common.CodebaseMemoryCacheEnv] != common.CodebaseMemoryCacheDir {
			t.Fatalf("expected %s=%s, got %v", common.CodebaseMemoryCacheEnv, common.CodebaseMemoryCacheDir, env[common.CodebaseMemoryCacheEnv])
		}
	})

	t.Run("redacts inherited environment variables from shell tools", func(t *testing.T) {
		input := *baseInput
		input.AgentRunMode = console.AgentRunModeWrite

		_, content, err := settings(&input)
		if err != nil {
			t.Fatalf("settings() failed: %v", err)
		}

		var out struct {
			Security struct {
				EnvironmentVariableRedaction struct {
					Enabled bool `json:"enabled"`
				} `json:"environmentVariableRedaction"`
			} `json:"security"`
		}
		if err := json.Unmarshal([]byte(content), &out); err != nil {
			t.Fatalf("generated content is not valid JSON: %v", err)
		}
		if !out.Security.EnvironmentVariableRedaction.Enabled {
			t.Fatal("security.environmentVariableRedaction.enabled = false, want true")
		}
	})

	t.Run("tools.core differs by mode", func(t *testing.T) {
		writeInput := *baseInput
		writeInput.AgentRunMode = console.AgentRunModeWrite
		_, writeContent, err := settings(&writeInput)
		if err != nil {
			t.Fatalf("settings() WRITE failed: %v", err)
		}

		analyzeInput := *baseInput
		analyzeInput.AgentRunMode = console.AgentRunModeAnalyze
		_, analyzeContent, err := settings(&analyzeInput)
		if err != nil {
			t.Fatalf("settings() ANALYZE failed: %v", err)
		}

		reviewInput := *baseInput
		reviewInput.AgentRunMode = console.AgentRunModeReview
		_, reviewContent, err := settings(&reviewInput)
		if err != nil {
			t.Fatalf("settings() REVIEW failed: %v", err)
		}

		var writeOut, analyzeOut, reviewOut map[string]any
		if err := json.Unmarshal([]byte(writeContent), &writeOut); err != nil {
			t.Fatalf("WRITE content not valid JSON: %v", err)
		}
		if err := json.Unmarshal([]byte(analyzeContent), &analyzeOut); err != nil {
			t.Fatalf("ANALYZE content not valid JSON: %v", err)
		}
		if err := json.Unmarshal([]byte(reviewContent), &reviewOut); err != nil {
			t.Fatalf("REVIEW content not valid JSON: %v", err)
		}

		writeTools := writeOut["tools"].(map[string]any)
		analyzeTools := analyzeOut["tools"].(map[string]any)
		reviewTools := reviewOut["tools"].(map[string]any)
		writeCoreTools, _ := writeTools["core"].([]any)
		analyzeCoreTools, _ := analyzeTools["core"].([]any)
		reviewCoreTools, _ := reviewTools["core"].([]any)

		hasWriteFile := false
		for _, t := range writeCoreTools {
			if s, ok := t.(string); ok && s == "write_file" {
				hasWriteFile = true
				break
			}
		}
		if !hasWriteFile {
			t.Error("WRITE mode tools.core should include write_file")
		}

		hasWriteInAnalyze := false
		for _, t := range analyzeCoreTools {
			if s, ok := t.(string); ok && (s == "write_file" || s == "replace") {
				hasWriteInAnalyze = true
				break
			}
		}
		if hasWriteInAnalyze {
			t.Error("ANALYZE mode tools.core should not include write_file or replace")
		}
		for _, tool := range reviewCoreTools {
			if tool == "write_file" || tool == "replace" {
				t.Error("REVIEW mode tools.core should not include write_file or replace")
			}
		}
		if _, ok := writeOut["coreTools"]; ok {
			t.Error("settings unexpectedly contains deprecated top-level coreTools")
		}
		if _, ok := writeOut["excludeTools"]; ok {
			t.Error("settings unexpectedly contains deprecated top-level excludeTools")
		}
		if _, ok := writeTools["exclude"]; ok {
			t.Error("settings unexpectedly contains deprecated tools.exclude")
		}
		if writeTools["shell"].(map[string]any)["inactivityTimeout"] != float64(baseInput.InactivityTimeout) {
			t.Errorf("tools.shell.inactivityTimeout = %v, want %d", writeTools["shell"].(map[string]any)["inactivityTimeout"], baseInput.InactivityTimeout)
		}
	})

	t.Run("quotes model", func(t *testing.T) {
		input := *baseInput
		input.Model = "gemini-3.1-\"flash\""

		_, content, err := settings(&input)
		if err != nil {
			t.Fatalf("settings() failed: %v", err)
		}

		var out struct {
			Context struct {
				IncludeDirectories []string `json:"includeDirectories"`
			} `json:"context"`
			Model struct {
				Name string `json:"name"`
			} `json:"model"`
		}
		if err := json.Unmarshal([]byte(content), &out); err != nil {
			t.Fatalf("generated content is not valid JSON: %v", err)
		}
		if out.Model.Name != input.Model {
			t.Errorf("model = %q, want %q", out.Model.Name, input.Model)
		}
		if len(out.Context.IncludeDirectories) != 0 {
			t.Errorf("context.includeDirectories = %#v, want no auxiliary directories", out.Context.IncludeDirectories)
		}
	})
}

func TestSettingsTemplate_ExternalMCPServer(t *testing.T) {
	t.Setenv(mcp.EnvServers, `[{"name":"linear","url":"https://mcp.linear.app/mcp","allowedTools":["list_issues"],"headers":{"Authorization":"Bearer secret"}}]`)

	input := &ConfigTemplateInput{
		Model:        "gemini-3.1-flash-lite",
		AgentRunMode: console.AgentRunModeWrite,
	}
	_, content, err := settings(input)
	if err != nil {
		t.Fatalf("settings() failed: %v", err)
	}

	var out map[string]any
	if err := json.Unmarshal([]byte(content), &out); err != nil {
		t.Fatalf("generated content is not valid JSON: %v", err)
	}
	linear := out["mcpServers"].(map[string]any)["linear"].(map[string]any)
	if linear["httpUrl"] != "https://mcp.linear.app/mcp" {
		t.Fatalf("httpUrl = %v", linear["httpUrl"])
	}
	headers := linear["headers"].(map[string]any)
	if headers["Authorization"] != "Bearer secret" {
		t.Fatalf("headers = %#v", headers)
	}
	includeTools := linear["includeTools"].([]any)
	if len(includeTools) != 1 || includeTools[0] != "list_issues" {
		t.Fatalf("includeTools = %#v", includeTools)
	}
}
