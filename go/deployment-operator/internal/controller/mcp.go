package controller

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/mcp"
)

func mcpServersPayload(servers []mcp.Server) string {
	if len(servers) == 0 {
		return ""
	}

	data, err := json.Marshal(servers)
	if err != nil {
		return ""
	}
	return string(data)
}

func (r *AgentRunReconciler) resolveMCPServers(ctx context.Context, namespace string, servers []v1alpha1.MCPServer) ([]mcp.Server, error) {
	return resolveMCPServers(ctx, servers, r.configurationFetcher(namespace))
}

func resolveMCPServers(ctx context.Context, servers []v1alpha1.MCPServer, fetcher ConfigurationFetcher) ([]mcp.Server, error) {
	if len(servers) == 0 {
		return nil, nil
	}

	out := make([]mcp.Server, 0, len(servers))
	for _, server := range servers {
		item := mcp.Server{
			Name:         server.Name,
			URL:          server.URL,
			AllowedTools: server.AllowedTools,
		}
		if len(server.Headers) == 0 {
			out = append(out, item)
			continue
		}

		headers, err := resolveMCPHeaders(ctx, server, fetcher)
		if err != nil {
			return nil, err
		}
		item.Headers = headers
		out = append(out, item)
	}
	return out, nil
}

func resolveMCPHeaders(ctx context.Context, server v1alpha1.MCPServer, fetcher ConfigurationFetcher) (map[string]string, error) {
	headers := make(map[string]string, len(server.Headers))
	for _, header := range server.Headers {
		if header.Value != nil {
			headers[header.Name] = *header.Value
			continue
		}
		if header.ValueFrom == nil {
			continue
		}

		value, err := envVarValue(ctx, fetcher, header.ValueFrom)
		if err != nil {
			return nil, fmt.Errorf("mcp server %q header %q: %w", server.Name, header.Name, err)
		}
		headers[header.Name] = value
	}
	if len(headers) == 0 {
		return nil, nil
	}
	return headers, nil
}
