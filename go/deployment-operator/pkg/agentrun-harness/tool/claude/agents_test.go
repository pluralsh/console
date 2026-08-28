package claude

import (
	"encoding/json"
	"testing"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/mcp"
)

func TestExternalMCPAllowTools(t *testing.T) {
	all := externalMCPAllowTools([]mcp.Server{{Name: "linear", URL: "https://mcp.linear.app/mcp"}})
	if len(all) != 1 || all[0] != "mcp__linear__*" {
		t.Fatalf("wildcard tools = %#v", all)
	}

	filtered := externalMCPAllowTools([]mcp.Server{{
		Name:         "linear",
		URL:          "https://mcp.linear.app/mcp",
		AllowedTools: []string{"list_issues", "create_issue"},
	}})
	if len(filtered) != 2 || filtered[0] != "mcp__linear__list_issues" || filtered[1] != "mcp__linear__create_issue" {
		t.Fatalf("allowlisted tools = %#v", filtered)
	}
}

func TestAgentWithMCPTools(t *testing.T) {
	out := agentWithMCPTools(analysisAgent, []string{"mcp__linear__*"})
	payload := map[string]agentDef{}
	if err := json.Unmarshal([]byte(out), &payload); err != nil {
		t.Fatal(err)
	}
	found := false
	for _, tool := range payload["analysis"].Tools {
		if tool == "mcp__linear__*" {
			found = true
		}
	}
	if !found {
		t.Fatalf("analysis tools = %#v", payload["analysis"].Tools)
	}
}
