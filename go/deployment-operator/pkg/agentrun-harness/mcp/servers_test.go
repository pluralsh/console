package mcp

import (
	"encoding/json"
	"os"
	"testing"
)

func TestLoadIncludesHeadersAndSkipsReserved(t *testing.T) {
	t.Setenv(EnvServers, mustJSON(t, []Server{{
		Name:         "linear",
		URL:          "https://mcp.linear.app/mcp",
		AllowedTools: []string{"list_issues"},
		Headers:      map[string]string{"Authorization": "Bearer secret"},
	}, {
		Name: "plural",
		URL:  "https://example.invalid/mcp",
	}}))

	servers, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if len(servers) != 1 {
		t.Fatalf("Load() returned %d servers, want 1", len(servers))
	}
	if servers[0].Name != "linear" {
		t.Fatalf("name = %q", servers[0].Name)
	}
	if !servers[0].HasAllowedTools() {
		t.Fatal("expected allowed tools")
	}
	if servers[0].Headers["Authorization"] != "Bearer secret" {
		t.Fatalf("headers = %#v", servers[0].Headers)
	}
}

func TestLoadEmpty(t *testing.T) {
	os.Unsetenv(EnvServers)
	servers, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if servers != nil {
		t.Fatalf("Load() = %#v, want nil", servers)
	}
}

func mustJSON(t *testing.T, value any) string {
	t.Helper()
	data, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	return string(data)
}
