package tool

import (
	"testing"
	"time"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func TestNewComposesOpenCodeRuntime(t *testing.T) {
	config := toolv1.Config{
		WorkDir:       t.TempDir(),
		RepositoryDir: t.TempDir(),
		Run: &agentrunv1.AgentRun{
			Mode: console.AgentRunModeReview,
			Runtime: &agentrunv1.AgentRuntime{Config: &agentrunv1.AgentRuntimeConfig{
				OpenCode: &agentrunv1.OpencodeConfig{Provider: "anthropic", Model: "claude-sonnet-4-6", Timeout: time.Minute},
			}},
		},
	}

	created, err := New(console.AgentRuntimeTypeOpencode, config)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}
	if _, ok := created.(*toolv1.Runtime); !ok {
		t.Fatalf("OpenCode factory returned %T, want *v1.Runtime", created)
	}
}

func TestNewComposesCodexRuntime(t *testing.T) {
	config := toolv1.Config{
		WorkDir:       t.TempDir(),
		RepositoryDir: t.TempDir(),
		Run: &agentrunv1.AgentRun{
			Mode: console.AgentRunModeWrite,
			Runtime: &agentrunv1.AgentRuntime{Config: &agentrunv1.AgentRuntimeConfig{
				Codex: &agentrunv1.CodexConfig{Model: "gpt-5.4", Timeout: time.Minute},
			}},
		},
	}

	created, err := New(console.AgentRuntimeTypeCodex, config)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}
	if _, ok := created.(*toolv1.Runtime); !ok {
		t.Fatalf("Codex factory returned %T, want *v1.Runtime", created)
	}
}

func TestNewRejectsMissingAgentRun(t *testing.T) {
	if _, err := New(console.AgentRuntimeTypeClaude, toolv1.Config{}); err == nil {
		t.Fatal("New() error = nil, want missing agent run error")
	}
}
