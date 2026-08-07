package main

import (
	"testing"

	consoleclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/internal/mcpserver/agent/tool"
)

func TestExcludeFollowupTools(t *testing.T) {
	followup := true
	toolMap := map[tool.ID]tool.Tool{
		tool.CreateBranchTool:      nil,
		tool.CreateCommitTool:      nil,
		tool.CreatePullRequestTool: nil,
	}

	excludeFollowupTools(toolMap, &consoleclient.AgentRunFragment{Followup: &followup})

	if _, ok := toolMap[tool.CreateBranchTool]; ok {
		t.Fatal("expected createBranch to be excluded for follow-up runs")
	}
	if _, ok := toolMap[tool.CreatePullRequestTool]; ok {
		t.Fatal("expected agentPullRequest to be excluded for follow-up runs")
	}
	if _, ok := toolMap[tool.CreateCommitTool]; !ok {
		t.Fatal("expected createCommit to remain available for follow-up runs")
	}
}

func TestExcludeFollowupToolsLeavesRegularRunTools(t *testing.T) {
	followup := false
	toolMap := map[tool.ID]tool.Tool{
		tool.CreateBranchTool:      nil,
		tool.CreateCommitTool:      nil,
		tool.CreatePullRequestTool: nil,
	}

	excludeFollowupTools(toolMap, &consoleclient.AgentRunFragment{Followup: &followup})

	for _, toolID := range []tool.ID{
		tool.CreateBranchTool,
		tool.CreateCommitTool,
		tool.CreatePullRequestTool,
	} {
		if _, ok := toolMap[toolID]; !ok {
			t.Fatalf("expected %s to remain available for regular runs", toolID)
		}
	}
}
