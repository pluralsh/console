package acp

import (
	"context"
	"time"

	acpsdk "github.com/coder/acp-go-sdk"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/usage"
)

// SessionSettings are the ACP-native identifiers projected by a provider.
type SessionSettings struct {
	ModeID  string
	ModelID string
	// Reasoning is applied through the provider's reasoning_effort option.
	Reasoning string
}

// Request contains the provider-neutral inputs for one ACP turn.
type Request struct {
	Cwd             string
	Prompt          string
	SessionID       string
	Settings        SessionSettings
	FileSystemWrite bool
}

// Result contains the latest session state observed by the ACP engine.
type Result struct {
	SessionID string
}

// Sink receives provider-neutral events from an ACP turn.
type Sink interface {
	Session(string)
	Message(*console.AgentMessageAttributes, string)
	ToolCallOutput(string, string)
	Usage(usage.Record)
}

// SessionRestoreRequest identifies a prior session and its workspace.
type SessionRestoreRequest struct {
	Cwd       string
	SessionID string
}

// SessionRestoreResponse contains the setup state returned after restoring a
// provider session.
type SessionRestoreResponse struct {
	Modes         *acpsdk.SessionModeState
	ConfigOptions []acpsdk.SessionConfigOption
}

// SessionRestorer restores a prior session through the provider's supported
// ACP method. ACP versions differ between session/resume and session/load.
type SessionRestorer func(context.Context, *acpsdk.ClientSideConnection, SessionRestoreRequest) (SessionRestoreResponse, error)

// ResumeSession restores sessions through the modern ACP session/resume
// method. It is the default for providers that support it.
func ResumeSession(ctx context.Context, connection *acpsdk.ClientSideConnection, request SessionRestoreRequest) (SessionRestoreResponse, error) {
	response, err := connection.ResumeSession(ctx, acpsdk.ResumeSessionRequest{
		Cwd: request.Cwd, McpServers: []acpsdk.McpServer{}, SessionId: acpsdk.SessionId(request.SessionID),
	})
	if err != nil {
		return SessionRestoreResponse{}, err
	}
	return SessionRestoreResponse{Modes: response.Modes, ConfigOptions: response.ConfigOptions}, nil
}

// LoadSession restores sessions through ACP's session/load method.
func LoadSession(ctx context.Context, connection *acpsdk.ClientSideConnection, request SessionRestoreRequest) (SessionRestoreResponse, error) {
	response, err := connection.LoadSession(ctx, acpsdk.LoadSessionRequest{
		Cwd: request.Cwd, McpServers: []acpsdk.McpServer{}, SessionId: acpsdk.SessionId(request.SessionID),
	})
	if err != nil {
		return SessionRestoreResponse{}, err
	}
	return SessionRestoreResponse{Modes: response.Modes, ConfigOptions: response.ConfigOptions}, nil
}

// UsageResolver returns usage from a prompt response. Providers can decode
// their metadata without coupling the provider-neutral engine to a schema.
type UsageResolver func(acpsdk.PromptResponse) *acpsdk.Usage

func defaultUsageResolver(prompt acpsdk.PromptResponse) *acpsdk.Usage {
	return prompt.Usage
}

// Option configures an Engine after its defaults are established.
type Option func(*Engine)

// WithStopTimeout sets a positive process shutdown grace period.
func WithStopTimeout(timeout time.Duration) Option {
	return func(engine *Engine) {
		if timeout > 0 {
			engine.stopTimeout = timeout
		}
	}
}

// WithSessionRestorer sets a non-nil provider session restoration method.
func WithSessionRestorer(restorer SessionRestorer) Option {
	return func(engine *Engine) {
		if restorer != nil {
			engine.restoreSession = restorer
		}
	}
}

// WithUsageResolver sets a non-nil provider prompt usage resolver.
func WithUsageResolver(resolver UsageResolver) Option {
	return func(engine *Engine) {
		if resolver != nil {
			engine.usageResolver = resolver
		}
	}
}
