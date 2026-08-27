package mcp

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
)

const (
	// EnvServers is the JSON payload describing extra remote MCP servers for an agent run.
	EnvServers = "PLRL_MCP_SERVERS"
)

// Server is the harness-side description of a remote MCP server.
// Header values are resolved by the agent-run controller before the pod starts.
type Server struct {
	Name         string            `json:"name"`
	URL          string            `json:"url"`
	AllowedTools []string          `json:"allowedTools,omitempty"`
	Headers      map[string]string `json:"headers,omitempty"`
}

// HasAllowedTools reports whether this server should expose an explicit tool allowlist.
func (s Server) HasAllowedTools() bool {
	return len(s.AllowedTools) > 0
}

// Load reads extra MCP servers from EnvServers.
func Load() ([]Server, error) {
	raw := os.Getenv(EnvServers)
	if strings.TrimSpace(raw) == "" {
		return nil, nil
	}

	var servers []Server
	if err := json.Unmarshal([]byte(raw), &servers); err != nil {
		return nil, fmt.Errorf("parse %s: %w", EnvServers, err)
	}

	out := make([]Server, 0, len(servers))
	for _, server := range servers {
		if server.Name == "" || server.URL == "" {
			klog.InfoS("skipping mcp server with empty name or url", "name", server.Name, "url", server.URL)
			continue
		}
		if reservedName(server.Name) {
			klog.InfoS("skipping mcp server that collides with a built-in server", "name", server.Name)
			continue
		}
		out = append(out, server)
	}
	return out, nil
}

func reservedName(name string) bool {
	return name == "plural" || name == common.CodebaseMemoryMCPServerName
}
