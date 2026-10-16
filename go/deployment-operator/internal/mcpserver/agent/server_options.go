package agent

import (
	"net/http"

	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/internal/mcpserver/agent/openaiproxy"
	"github.com/pluralsh/console/go/deployment-operator/internal/mcpserver/agent/tool"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
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
// that convert streaming client requests into non-streaming upstream calls,
// authenticating with the deploy token instead of the caller's.
func WithOpenAIProxy(chatCompletionsURL, responsesURL string, token func() string) Option {
	return func(s *Server) {
		if chatCompletionsURL != "" {
			handler, err := openaiproxy.NewHandler(openaiproxy.Config{UpstreamURL: chatCompletionsURL})
			if err != nil {
				klog.Fatalf("could not configure openai chat completion proxy: %v", err)
			}
			s.openaiProxy = withBearerToken(token, handler)
		}

		if responsesURL != "" {
			handler, err := openaiproxy.NewResponsesHandler(openaiproxy.ResponsesConfig{UpstreamURL: responsesURL})
			if err != nil {
				klog.Fatalf("could not configure openai responses proxy: %v", err)
			}
			s.openaiResponsesProxy = withBearerToken(token, handler)
		}
	}
}

// WithConsoleAIProxy registers a local reverse proxy to the Console AI proxy
// that authenticates with the deploy token, so the agent never holds it.
func WithConsoleAIProxy(upstreamURL string, token func() string) Option {
	return func(s *Server) {
		handler, err := newConsoleAIProxy(common.AgentConsoleAIPath, upstreamURL, token)
		if err != nil {
			klog.Fatalf("could not configure console ai proxy: %v", err)
		}
		s.consoleAIProxy = handler
	}
}

// WithWorkbenchMCPProxy registers a local reverse proxy that authenticates to
// the originating workbench with the agent run's short-lived user token.
func WithWorkbenchMCPProxy(upstreamURL string, token func() string) Option {
	return func(s *Server) {
		handler, err := newTokenProxy(upstreamURL, "Bearer", token, nil)
		if err != nil {
			klog.Fatalf("could not configure workbench mcp proxy: %v", err)
		}
		s.workbenchMCPProxy = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// The upstream URL's query carries the operator's tool filter, and the proxy would append
			// the caller's query after it, letting the agent pick tools outside that filter.
			r.URL.RawQuery = ""
			handler.ServeHTTP(w, r)
		})
	}
}

const (
	consoleExtClientHeader   = "Plural-Client"
	consoleExtClient         = "agent-harness"
	consoleExtAgentRunHeader = "Plural-Agent-Run"
)

// WithConsoleExtProxy registers a local reverse proxy to the Console ext API
// that authenticates with the deploy token, so the harness container never holds it.
// Only the harness's own operations on this agent run are let through.
func WithConsoleExtProxy(upstreamURL string, token func() string, agentRunID string) Option {
	return func(s *Server) {
		// Console only reads deploy tokens from "Token", and echoes a "Bearer" secret back as a cookie.
		handler, err := newTokenProxy(upstreamURL, "Token", token, nil)
		if err != nil {
			klog.Fatalf("could not configure console ext proxy: %v", err)
		}
		s.consoleExtProxy = newConsoleExtAllowlist(agentRunID, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Overwrite any caller values so Console can tell these calls came through the sidecar.
			r.Header.Set(consoleExtClientHeader, consoleExtClient)
			r.Header.Set(consoleExtAgentRunHeader, agentRunID)
			handler.ServeHTTP(w, r)
		}))
	}
}
