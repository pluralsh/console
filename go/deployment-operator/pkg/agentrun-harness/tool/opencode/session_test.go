package opencode

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/artifacts"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

func TestAgentExportStagesNativeSession(t *testing.T) {
	binDir := t.TempDir()
	opencodePath := filepath.Join(binDir, "opencode")
	script := "#!/bin/sh\n" +
		"if [ \"$1\" = \"export\" ]; then\n" +
		"  printf '%s' '{\"id\":\"session-1\"}'\n" +
		"  exit 0\n" +
		"fi\n" +
		"echo \"unexpected args: $*\" >&2\n" +
		"exit 1\n"
	if err := os.WriteFile(opencodePath, []byte(script), 0755); err != nil {
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

func TestAgentImportRunsSessionImport(t *testing.T) {
	binDir := t.TempDir()
	logPath := filepath.Join(t.TempDir(), "opencode.log")
	opencodePath := filepath.Join(binDir, "opencode")
	script := "#!/bin/sh\n" +
		"printf '%s\\n' \"$*\" > " + logPath + "\n" +
		"printf '%s\\n' \"$XDG_DATA_HOME\" >> " + logPath + "\n" +
		"printf '%s\\n' \"$PWD\" >> " + logPath + "\n" +
		"if [ \"$1\" = \"import\" ]; then\n" +
		"  exit 0\n" +
		"fi\n" +
		"exit 1\n"
	if err := os.WriteFile(opencodePath, []byte(script), 0755); err != nil {
		t.Fatalf("write fake opencode: %v", err)
	}
	t.Setenv("PATH", binDir+string(os.PathListSeparator)+os.Getenv("PATH"))

	workDir := t.TempDir()
	repositoryDir := t.TempDir()
	extractDir := t.TempDir()
	archiveDir := filepath.Join(extractDir, "opencode")
	if err := os.MkdirAll(archiveDir, 0755); err != nil {
		t.Fatalf("mkdir archive: %v", err)
	}
	sessionJSON := filepath.Join(archiveDir, artifacts.SessionJSONName)
	if err := os.WriteFile(sessionJSON, []byte(`{"id":"ses_abc"}`), 0644); err != nil {
		t.Fatalf("write session json: %v", err)
	}

	agent := NewAgent(toolv1.Config{WorkDir: workDir, RepositoryDir: repositoryDir, Run: agentRun("openai", "gpt-5.4", false, false)})
	sessionID, err := agent.Import(nil, toolv1.ImportRequest{
		Manifest: &artifacts.SessionManifest{
			Session: artifacts.SessionMetadata{ID: "ses_abc", ArchivePath: "opencode"},
		},
		ExtractDir: extractDir,
	})
	if err != nil {
		t.Fatalf("Import() error = %v", err)
	}
	if sessionID != "ses_abc" {
		t.Fatalf("sessionID = %q", sessionID)
	}

	logData, err := os.ReadFile(logPath)
	if err != nil {
		t.Fatalf("read opencode log: %v", err)
	}
	lines := strings.Split(strings.TrimSpace(string(logData)), "\n")
	if len(lines) < 3 {
		t.Fatalf("opencode log = %q", logData)
	}
	if lines[0] != "import "+sessionJSON {
		t.Fatalf("import args = %q, want %q", lines[0], "import "+sessionJSON)
	}
	wantDataHome := filepath.Join(workDir, ".local", "share")
	if lines[1] != wantDataHome {
		t.Fatalf("XDG_DATA_HOME = %q, want %q", lines[1], wantDataHome)
	}
	if lines[2] != repositoryDir {
		t.Fatalf("PWD = %q, want %q", lines[2], repositoryDir)
	}
}
