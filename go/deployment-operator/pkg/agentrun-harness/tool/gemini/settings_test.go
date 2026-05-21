package gemini

import (
	"encoding/json"
	"testing"

	"github.com/samber/lo"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
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

func TestSettingsTemplate_ExaMcpServers(t *testing.T) {
	baseInput := &ConfigTemplateInput{
		Model:         ModelGemini31FlashLite,
		RepositoryDir: "/repo",
		AgentRunID:    "run-123",
		AgentRunMode:  console.AgentRunModeWrite,
	}

	t.Run("no ExaMcpConfigs renders only plural server", func(t *testing.T) {
		input := *baseInput
		_, content, err := settings(&input)
		if err != nil {
			t.Fatalf("settings() failed: %v", err)
		}

		var out map[string]any
		if err := json.Unmarshal([]byte(content), &out); err != nil {
			t.Fatalf("generated content is not valid JSON: %v\n%s", err, content)
		}

		mcpServers := out["mcpServers"].(map[string]any)
		if len(mcpServers) != 1 {
			t.Errorf("expected 1 MCP server, got %d: %v", len(mcpServers), mcpServers)
		}
		if _, ok := mcpServers["plural"]; !ok {
			t.Error("mcpServers.plural missing")
		}
	})

	t.Run("ExaMcpConfig without ApiKey is rendered with url and trust", func(t *testing.T) {
		input := *baseInput
		input.ExaMcpConfigs = []agentrunv1.ExaMcpServerConfig{
			{Name: "exa", Url: "https://mcp.exa.ai/mcp"},
		}

		_, content, err := settings(&input)
		if err != nil {
			t.Fatalf("settings() failed: %v", err)
		}

		var out map[string]any
		if err := json.Unmarshal([]byte(content), &out); err != nil {
			t.Fatalf("generated content is not valid JSON: %v\n%s", err, content)
		}

		mcpServers := out["mcpServers"].(map[string]any)
		exa, ok := mcpServers["exa"].(map[string]any)
		if !ok {
			t.Fatal("mcpServers.exa missing or not an object")
		}

		if exa["url"] != "https://mcp.exa.ai/mcp" {
			t.Errorf("expected url https://mcp.exa.ai/mcp, got %v", exa["url"])
		}
		if exa["trust"] != true {
			t.Errorf("expected trust=true, got %v", exa["trust"])
		}
		if _, hasHeaders := exa["headers"]; hasHeaders {
			t.Error("headers should not be present when ApiKey is nil")
		}
	})

	t.Run("ExaMcpConfig with ApiKey renders x-api-key header", func(t *testing.T) {
		input := *baseInput
		input.ExaMcpConfigs = []agentrunv1.ExaMcpServerConfig{
			{Name: "exa", Url: "https://mcp.exa.ai/mcp", ApiKey: lo.ToPtr("secret-key")},
		}

		_, content, err := settings(&input)
		if err != nil {
			t.Fatalf("settings() failed: %v", err)
		}

		var out map[string]any
		if err := json.Unmarshal([]byte(content), &out); err != nil {
			t.Fatalf("generated content is not valid JSON: %v\n%s", err, content)
		}

		mcpServers := out["mcpServers"].(map[string]any)
		exa := mcpServers["exa"].(map[string]any)
		headers, ok := exa["headers"].(map[string]any)
		if !ok {
			t.Fatal("mcpServers.exa.headers missing or not an object")
		}
		if headers["x-api-key"] != "secret-key" {
			t.Errorf("expected x-api-key=secret-key, got %v", headers["x-api-key"])
		}
	})

	t.Run("multiple ExaMcpConfigs are all rendered", func(t *testing.T) {
		input := *baseInput
		input.ExaMcpConfigs = []agentrunv1.ExaMcpServerConfig{
			{Name: "exa", Url: "https://mcp.exa.ai/mcp", ApiKey: lo.ToPtr("key1")},
			{Name: "search", Url: "https://mcp.search.example/mcp"},
		}

		_, content, err := settings(&input)
		if err != nil {
			t.Fatalf("settings() failed: %v", err)
		}

		var out map[string]any
		if err := json.Unmarshal([]byte(content), &out); err != nil {
			t.Fatalf("generated content is not valid JSON: %v\n%s", err, content)
		}

		mcpServers := out["mcpServers"].(map[string]any)
		if len(mcpServers) != 3 {
			t.Errorf("expected 3 MCP servers (plural + 2 exa), got %d", len(mcpServers))
		}
		if _, ok := mcpServers["exa"]; !ok {
			t.Error("mcpServers.exa missing")
		}
		if _, ok := mcpServers["search"]; !ok {
			t.Error("mcpServers.search missing")
		}
	})
}
