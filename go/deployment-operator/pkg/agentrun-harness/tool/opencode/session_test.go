package opencode

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/artifacts"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func TestAgentExportStagesNativeSession(t *testing.T) {
	binDir := t.TempDir()
	opencodePath := filepath.Join(binDir, "opencode")
	if err := os.WriteFile(opencodePath, []byte("#!/bin/sh\nprintf '%s' '{\"id\":\"session-1\"}'\n"), 0755); err != nil {
		t.Fatalf("write fake opencode: %v", err)
	}
	t.Setenv("PATH", binDir+string(os.PathListSeparator)+os.Getenv("PATH"))

	config := toolv1.Config{WorkDir: t.TempDir(), RepositoryDir: t.TempDir(), Run: agentRun("openai", "gpt-5.4", false, false)}
	outputDir := t.TempDir()
	result, err := NewAgent(config).Export(nil, toolv1.ExportRequest{SessionID: "session-1", OutputDir: outputDir})
	if err != nil {
		t.Fatalf("Export() error = %v", err)
	}
	if result.SessionSource.Path != outputDir || result.SessionSource.ArchivePath != "opencode" {
		t.Fatalf("session source = %#v", result.SessionSource)
	}
	data, err := os.ReadFile(filepath.Join(outputDir, artifacts.SessionJSONName))
	if err != nil {
		t.Fatalf("read staged session: %v", err)
	}
	if string(data) != `{"id":"session-1"}` {
		t.Fatalf("staged session = %q", data)
	}
}
