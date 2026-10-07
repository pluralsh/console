package pi

import (
	"testing"

	console "github.com/pluralsh/console/go/client"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func TestTransportCapabilitiesReflectRunMode(t *testing.T) {
	for _, mode := range []console.AgentRunMode{
		console.AgentRunModeAnalyze,
		console.AgentRunModeReview,
		console.AgentRunModeWrite,
	} {
		t.Run(string(mode), func(t *testing.T) {
			run := piTestRun(mode, "openai", "gpt-5.4", nil, false)
			transport, err := NewTransport(NewAgent(toolv1.Config{
				WorkDir:       t.TempDir(),
				RepositoryDir: t.TempDir(),
				Run:           run,
			}))
			if err != nil {
				t.Fatal(err)
			}
			capabilities := transport.Capabilities()
			if !capabilities.SessionResume || !capabilities.ToolCallOutputStreaming || !capabilities.FileSystemRead {
				t.Fatalf("capabilities = %#v", capabilities)
			}
			if capabilities.FileSystemWrite != (mode == console.AgentRunModeWrite) {
				t.Fatalf("FileSystemWrite = %t, mode = %q", capabilities.FileSystemWrite, mode)
			}
		})
	}
}

func TestTransportModelIDUsesNativeProvider(t *testing.T) {
	endpoint := "https://llm.example/v1"
	run := piTestRun(console.AgentRunModeWrite, "litellm", "custom-model", &endpoint, false)
	agent := NewAgent(toolv1.Config{WorkDir: t.TempDir(), RepositoryDir: t.TempDir(), Run: run})
	transport, err := NewTransport(agent)
	if err != nil {
		t.Fatal(err)
	}
	if got := transport.modelID(toolv1.Settings{Model: toolv1.ModelSelection{Name: "custom-model"}}); got != "openai/custom-model" {
		t.Fatalf("modelID = %q", got)
	}

	proxyRun := piTestRun(console.AgentRunModeWrite, "", "gpt-5.4", nil, true)
	proxyAgent := NewAgent(toolv1.Config{WorkDir: t.TempDir(), RepositoryDir: t.TempDir(), Run: proxyRun})
	proxyTransport, err := NewTransport(proxyAgent)
	if err != nil {
		t.Fatal(err)
	}
	if got := proxyTransport.modelID(toolv1.Settings{Model: toolv1.ModelSelection{Name: "openai/gpt-5.4"}}); got != "plural/openai/gpt-5.4" {
		t.Fatalf("proxy modelID = %q", got)
	}
}
