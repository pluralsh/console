package acp

import (
	"testing"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func TestNewOpenCodeSelectsConfiguredAgentForRunMode(t *testing.T) {
	for _, test := range []struct {
		name string
		mode console.AgentRunMode
		want string
	}{
		{name: "write", mode: console.AgentRunModeWrite, want: "autonomous"},
		{name: "analyze", mode: console.AgentRunModeAnalyze, want: "analysis"},
	} {
		t.Run(test.name, func(t *testing.T) {
			config := toolv1.Config{Run: &agentrunv1.AgentRun{
				Mode: test.mode,
				Runtime: &agentrunv1.AgentRuntime{Config: &agentrunv1.AgentRuntimeConfig{
					OpenCode: &agentrunv1.OpencodeConfig{},
				}},
			}}
			tool := NewOpenCode(config).(*Tool)
			if tool.mode != test.want {
				t.Fatalf("ACP mode = %q, want configured OpenCode agent %q", tool.mode, test.want)
			}
		})
	}
}
