package acp

import (
	"time"

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
	Cwd       string
	Prompt    string
	SessionID string
	Settings  SessionSettings
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

// Config controls the ACP process shutdown grace period.
type Config struct {
	StopTimeout time.Duration
}
