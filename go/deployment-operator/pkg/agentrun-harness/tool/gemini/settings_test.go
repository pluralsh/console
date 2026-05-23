package gemini

import (
	"encoding/json"
	"testing"

	console "github.com/pluralsh/console/go/client"
)

//nolint:gocyclo
func TestSettingsTemplate_GenerateAndVerifyContents(t *testing.T) {
	baseInput := &ConfigTemplateInput{
		Model:         ModelGemini31FlashLite,
		RepositoryDir: "/repo",
		AgentRunID:    "run-123",
	}

	t.Run("plural MCP server uses in-pod remote URL", func(t *testing.T) {
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

		url, ok := plural["url"].(string)
		if !ok {
			t.Fatal("mcpServers.plural.url missing or not a string")
		}
		if url != "http://127.0.0.1:8080/mcp" {
			t.Errorf("expected mcpServers.plural.url=http://127.0.0.1:8080/mcp, got %q", url)
		}
	})

	t.Run("coreTools differ by mode", func(t *testing.T) {
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

		var writeOut, analyzeOut map[string]any
		if err := json.Unmarshal([]byte(writeContent), &writeOut); err != nil {
			t.Fatalf("WRITE content not valid JSON: %v", err)
		}
		if err := json.Unmarshal([]byte(analyzeContent), &analyzeOut); err != nil {
			t.Fatalf("ANALYZE content not valid JSON: %v", err)
		}

		writeCoreTools, _ := writeOut["coreTools"].([]any)
		analyzeCoreTools, _ := analyzeOut["coreTools"].([]any)

		hasWriteFile := false
		for _, t := range writeCoreTools {
			if s, ok := t.(string); ok && s == "WriteFileTool" {
				hasWriteFile = true
				break
			}
		}
		if !hasWriteFile {
			t.Error("WRITE mode coreTools should include WriteFileTool")
		}

		hasWriteInAnalyze := false
		for _, t := range analyzeCoreTools {
			if s, ok := t.(string); ok && (s == "WriteFileTool" || s == "EditTool") {
				hasWriteInAnalyze = true
				break
			}
		}
		if hasWriteInAnalyze {
			t.Error("ANALYZE mode coreTools should not include WriteFileTool or EditTool")
		}
	})
}
