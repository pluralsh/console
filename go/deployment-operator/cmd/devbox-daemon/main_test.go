package main

import (
	"bytes"
	"os"
	"path/filepath"
	"testing"

	"google.golang.org/protobuf/encoding/protojson"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/fakeacp"
)

func TestMain(m *testing.M) {
	if fakeacp.Enabled() {
		fakeacp.Main()
		os.Exit(0)
	}
	os.Exit(m.Run())
}

func TestProbeJSON(t *testing.T) {
	dir := t.TempDir()
	image := filepath.Join(dir, "image.json")
	if err := os.WriteFile(image, []byte(`{"contract":"v1","agents":{"claude":{"command":"claude","version":"2.0.0",
		"acp":{"command":"claude-agent-acp","version":"0.5.0"}},"codex":{"command":"codex","acp":{"command":"`+filepath.Join(dir, "missing")+`"}}}}`), 0o644); err != nil {
		t.Fatal(err)
	}
	t.Setenv("DEVBOX_AGENT_CLAUDE_COMMAND", os.Args[0]+" -test.run=^$")
	t.Setenv(fakeacp.EnvVar, "1")
	t.Setenv("HOME", dir)

	var stdout, stderr bytes.Buffer
	code := runProbe([]string{"--json", "--image-info", image, "--home", dir, "--default-agent", "claude"}, &stdout, &stderr)
	if code != 0 {
		t.Fatalf("exit %d\nstdout: %s\nstderr: %s", code, stdout.String(), stderr.String())
	}
	resp := &devboxv1.ProbeAgentsResponse{}
	if err := protojson.Unmarshal(stdout.Bytes(), resp); err != nil {
		t.Fatalf("output is not a ProbeAgentsResponse: %v\n%s", err, stdout.String())
	}
	byType := map[devboxv1.AgentType]*devboxv1.AgentCatalogEntry{}
	for _, e := range resp.GetAgents() {
		byType[e.GetType()] = e
	}
	c := byType[devboxv1.AgentType_AGENT_TYPE_CLAUDE]
	if c.GetProbeStatus() != devboxv1.ProbeStatus_PROBE_STATUS_OK || !c.GetIsDefault() || c.GetModelConfigOptionId() != "model" ||
		len(c.GetModels()) != 2 || c.GetAdapterVersion() != "1.0.0" || !c.GetCapabilities().GetLifecycle().GetResume() {
		t.Fatalf("claude entry %v", c)
	}
	if len(c.GetInitialCommands()) != 1 || c.GetInitialCommands()[0].GetName() != "review" {
		t.Fatalf("initial commands %v", c.GetInitialCommands())
	}
	if x := byType[devboxv1.AgentType_AGENT_TYPE_CODEX]; x.GetProbeStatus() != devboxv1.ProbeStatus_PROBE_STATUS_MISSING {
		t.Fatalf("codex entry %v", x)
	}
}

func TestVersionFlag(t *testing.T) {
	if code := run([]string{"-version"}); code != 0 {
		t.Fatalf("exit %d", code)
	}
}
