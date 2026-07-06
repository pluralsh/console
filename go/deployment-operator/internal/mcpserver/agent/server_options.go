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
