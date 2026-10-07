package mcp

import (
	"sort"

	acpsdk "github.com/coder/acp-go-sdk"

	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
)

const pluralMCPServerName = "plural"

// ACPServers returns the harness MCP servers that every ACP session should
// receive on session/new, session/resume, and session/load. Native provider
// config files are not sufficient for adapters such as codex-acp, which treat
// the ACP mcpServers list as the session source of truth.
func ACPServers() ([]acpsdk.McpServer, error) {
	servers := []acpsdk.McpServer{
		HTTPServer(pluralMCPServerName, common.AgentMCPServerURL, nil),
		StdioServer(common.CodebaseMemoryMCPServerName, common.CodebaseMemoryMCPCommand, nil, map[string]string{
			common.CodebaseMemoryCacheEnv: common.CodebaseMemoryCacheDir,
		}),
	}

	external, err := Load()
	if err != nil {
		return nil, err
	}
	for _, server := range external {
		servers = append(servers, HTTPServer(server.Name, server.URL, server.Headers))
	}
	return servers, nil
}

// HTTPServer builds an ACP HTTP MCP server entry.
func HTTPServer(name, url string, headers map[string]string) acpsdk.McpServer {
	return acpsdk.McpServer{
		Http: &acpsdk.McpServerHttpInline{
			Type:    "http",
			Name:    name,
			Url:     url,
			Headers: httpHeaders(headers),
		},
	}
}

// StdioServer builds an ACP stdio MCP server entry.
func StdioServer(name, command string, args []string, env map[string]string) acpsdk.McpServer {
	if args == nil {
		args = []string{}
	}
	return acpsdk.McpServer{
		Stdio: &acpsdk.McpServerStdio{
			Name:    name,
			Command: command,
			Args:    args,
			Env:     envVariables(env),
		},
	}
}

func httpHeaders(headers map[string]string) []acpsdk.HttpHeader {
	if len(headers) == 0 {
		return []acpsdk.HttpHeader{}
	}
	keys := make([]string, 0, len(headers))
	for key := range headers {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	out := make([]acpsdk.HttpHeader, 0, len(keys))
	for _, key := range keys {
		out = append(out, acpsdk.HttpHeader{Name: key, Value: headers[key]})
	}
	return out
}

func envVariables(env map[string]string) []acpsdk.EnvVariable {
	if len(env) == 0 {
		return []acpsdk.EnvVariable{}
	}
	keys := make([]string, 0, len(env))
	for key := range env {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	out := make([]acpsdk.EnvVariable, 0, len(keys))
	for _, key := range keys {
		out = append(out, acpsdk.EnvVariable{Name: key, Value: env[key]})
	}
	return out
}
