package agent

import (
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/internal/mcpserver/agent/openaiproxy"
	"github.com/pluralsh/console/go/deployment-operator/internal/mcpserver/agent/tool"
)

// Option is a function that configures an MCP server instance
type Option func(*Server)

// WithTools enables the MCP server to support tools
func WithTools() Option {
	return func(s *Server) {
		s.toolsEnabled = true
	}
}

// WithTool registers a tool with the MCP server
func WithTool(tool tool.Tool) Option {
	return func(s *Server) {
		s.tools = append(s.tools, tool)
	}
}

// WithVersion sets the MCP server version
func WithVersion(version string) Option {
	return func(s *Server) {
		s.version = version
	}
}

// WithOpenAIProxy registers local OpenAI chat completion and responses endpoints
// that convert streaming client requests into non-streaming upstream calls.
func WithOpenAIProxy(chatCompletionsURL, responsesURL string) Option {
	return func(s *Server) {
		if chatCompletionsURL != "" {
			handler, err := openaiproxy.NewHandler(openaiproxy.Config{UpstreamURL: chatCompletionsURL})
			if err != nil {
				klog.Fatalf("could not configure openai chat completion proxy: %v", err)
			}
			s.openaiProxy = handler
		}

		if responsesURL != "" {
			handler, err := openaiproxy.NewResponsesHandler(openaiproxy.ResponsesConfig{UpstreamURL: responsesURL})
			if err != nil {
				klog.Fatalf("could not configure openai responses proxy: %v", err)
			}
			s.openaiResponsesProxy = handler
		}
	}
}

// WithWorkbenchMCPProxy registers a local reverse proxy that authenticates to
// the originating workbench with the agent run's short-lived user token.
func WithWorkbenchMCPProxy(upstreamURL string, token func() string) Option {
	return func(s *Server) {
		handler, err := newBearerTokenProxy(upstreamURL, token)
		if err != nil {
			klog.Fatalf("could not configure workbench mcp proxy: %v", err)
		}
		s.workbenchMCPProxy = handler
	}
}

// WithConsoleExtProxy registers a local reverse proxy to the Console ext API
// that authenticates with the deploy token, so the harness container never holds it.
func WithConsoleExtProxy(upstreamURL, token string) Option {
	return func(s *Server) {
		handler, err := newBearerTokenProxy(upstreamURL, func() string { return token })
		if err != nil {
			klog.Fatalf("could not configure console ext proxy: %v", err)
		}
		s.consoleExtProxy = handler
	}
}
