package mcp

import (
	"testing"

	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
)

func TestACPServersIncludesBuiltInsAndExternalHTTP(t *testing.T) {
	t.Setenv(EnvServers, mustJSON(t, []Server{{
		Name:    "linear",
		URL:     "https://mcp.linear.app/mcp",
		Headers: map[string]string{"Authorization": "Bearer secret"},
	}}))

	servers, err := ACPServers()
	if err != nil {
		t.Fatalf("ACPServers() error = %v", err)
	}
	if len(servers) != 3 {
		t.Fatalf("ACPServers() returned %d servers, want 3", len(servers))
	}

	plural := servers[0].Http
	if plural == nil || plural.Name != pluralMCPServerName || plural.Url != common.AgentMCPServerURL || plural.Type != "http" {
		t.Fatalf("plural MCP = %#v", servers[0].Http)
	}
	if plural.Headers == nil {
		t.Fatal("plural MCP headers should be a non-nil slice")
	}

	codebase := servers[1].Stdio
	if codebase == nil || codebase.Name != common.CodebaseMemoryMCPServerName || codebase.Command != common.CodebaseMemoryMCPCommand {
		t.Fatalf("codebase MCP = %#v", servers[1].Stdio)
	}
	if len(codebase.Env) != 1 || codebase.Env[0].Name != common.CodebaseMemoryCacheEnv || codebase.Env[0].Value != common.CodebaseMemoryCacheDir {
		t.Fatalf("codebase MCP env = %#v", codebase.Env)
	}
	if codebase.Args == nil {
		t.Fatal("codebase MCP args should be a non-nil slice")
	}

	linear := servers[2].Http
	if linear == nil || linear.Name != "linear" || linear.Url != "https://mcp.linear.app/mcp" {
		t.Fatalf("linear MCP = %#v", servers[2].Http)
	}
	if len(linear.Headers) != 1 || linear.Headers[0].Name != "Authorization" || linear.Headers[0].Value != "Bearer secret" {
		t.Fatalf("linear headers = %#v", linear.Headers)
	}
}

func TestACPServersWithoutExternalEnv(t *testing.T) {
	t.Setenv(EnvServers, "")
	servers, err := ACPServers()
	if err != nil {
		t.Fatalf("ACPServers() error = %v", err)
	}
	if len(servers) != 2 {
		t.Fatalf("ACPServers() returned %d servers, want 2", len(servers))
	}
}
