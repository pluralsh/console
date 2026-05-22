package agent

import (
	"context"

	"github.com/mark3labs/mcp-go/server"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/internal/mcpserver/agent/tool"
	console "github.com/pluralsh/console/go/deployment-operator/pkg/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

// Server wraps the mcp server with Plural credentials
type Server struct {
	// name is the name of the MCP server
	name string

	// version is the version of the MCP server
	version string

	// server is the MCP server instance
	server *server.MCPServer

	// httpServer is the streamable HTTP transport server
	httpServer *server.StreamableHTTPServer

	// client is the Plural console client
	client console.Client

	// toolsEnabled indicates whether tools are enabled
	toolsEnabled bool

	// tools is a list of tools supported by the MCP server
	tools []tool.Tool
}

// Start starts the MCP server with streamable HTTP transport
func (in *Server) Start(addr string) error {
	klog.V(log.LogLevelDefault).InfoS("started plural console mcp server", "version", in.version)
	return in.httpServer.Start(addr)
}

// Shutdown gracefully stops the MCP HTTP server.
func (in *Server) Shutdown(ctx context.Context) error {
	if in == nil || in.httpServer == nil {
		return nil
	}

	return in.httpServer.Shutdown(ctx)
}

func (in *Server) init() *Server {
	in.server = server.NewMCPServer(
		in.name,
		in.version,
		server.WithToolCapabilities(in.toolsEnabled),
	)

	for _, tool := range in.tools {
		tool.Install(in.server)
		klog.V(log.LogLevelDefault).InfoS("registered tool with mcp server", "tool", tool.ID())
	}

	in.httpServer = server.NewStreamableHTTPServer(in.server)
	return in
}

// NewServer creates a new MCP server instance
func NewServer(client console.Client, options ...Option) *Server {
	mcpServer := &Server{
		name:    "Plural Console MCP Server",
		version: "0.0.0-dev",
		client:  client,
	}

	for _, option := range options {
		option(mcpServer)
	}

	return mcpServer.init()
}
