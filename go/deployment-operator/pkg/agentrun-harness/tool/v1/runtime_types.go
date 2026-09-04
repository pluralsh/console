package v1

import (
	"context"
	"slices"
	"time"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/artifacts"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/usage"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
)

// TransportKind identifies the protocol used to invoke an agent.
type TransportKind string

const (
	TransportKindRaw TransportKind = "raw"
	TransportKindACP TransportKind = "acp"
)

// TurnKind identifies where a turn occurs in an agent run.
type TurnKind string

const (
	TurnKindInitial  TurnKind = "initial"
	TurnKindFollowup TurnKind = "followup"
	TurnKindBabysit  TurnKind = "babysit"
)

// ConfigurePhase identifies the configuration pass being performed.
type ConfigurePhase string

const (
	ConfigurePhaseInitial ConfigurePhase = "initial"
	ConfigurePhaseBabysit ConfigurePhase = "babysit"
)

// ModelSelection is the model and optional Console AI provider selected for a
// turn. Provider is nil when a provider-native configuration has no exact
// Console AI provider equivalent.
type ModelSelection struct {
	// Provider is the Console AI provider selected for the turn.
	Provider *console.AiProvider

	// Name is the name of the model selected for the turn.
	Name string

	// Reasoning is the provider's reasoning effort, when configurable.
	Reasoning string
}

// Settings are the provider-neutral settings resolved by an Agent.
type Settings struct {
	Mode    console.AgentRunMode
	Model   ModelSelection
	Timeout time.Duration
	Proxy   bool
}

// FileSystemRequest describes the files an agent should prepare for a phase.
// It contains paths only; credentials and provider configuration remain owned
// by the Agent.
type FileSystemRequest struct {
	Phase         ConfigurePhase
	WorkDir       string
	RepositoryDir string
}

// FileSystemConfiguration prepares shared system prompt, skill, and template
// files for an agent phase.
type FileSystemConfiguration interface {
	Prepare(context.Context, FileSystemRequest) error
}

// AgentCapabilities describes the run modes supported by an agent.
type AgentCapabilities struct {
	Modes []console.AgentRunMode
}

// Supports reports whether mode is advertised by the agent.
func (in AgentCapabilities) Supports(mode console.AgentRunMode) bool {
	return slices.Contains(in.Modes, mode)
}

// TransportCapabilities describes protocol features available to Runtime.
type TransportCapabilities struct {
	SessionResume           bool
	ToolCallOutputStreaming bool
	UsageReporting          bool
	FileSystemRead          bool
	FileSystemWrite         bool
}

// ConfigureRequest carries one configuration pass. ConsoleToken is transient
// input and must not be copied into Settings or retained by Runtime.
type ConfigureRequest struct {
	Phase        ConfigurePhase
	ConsoleURL   string
	ConsoleToken string
	Settings     Settings
}

// ExportRequest asks an agent to stage its native session under OutputDir.
// Runtime owns OutputDir's lifetime and removes it after artifact building.
type ExportRequest struct {
	SessionID string
	OutputDir string
}

// ExportResult contains the source directory returned by an Agent.Export.
type ExportResult struct {
	SessionSource artifacts.SessionSource
}

// TurnSink receives provider-neutral events from Transport. Every callback
// is optional; Runtime supplies a nil-safe implementation when it starts a
// turn.
type TurnSink interface {
	Session(string)
	Message(*console.AgentMessageAttributes, string)
	ToolCallOutput(string, string)
	Usage(usage.Record)
}

// TurnRequest is the complete input for one serialized turn.
type TurnRequest struct {
	Kind      TurnKind
	Prompt    string
	SessionID string
	Settings  Settings
	// Options contains harness lifecycle hooks for the initial turn. A
	// Transport must apply every option when constructing the underlying
	// execution. Follow-up and babysit turns receive no options.
	Options []exec.Option
}

// TurnResult contains the latest session state observed by transport. A
// transport may return both a result and an error; Runtime retains a nonempty
// result session ID before routing the error.
type TurnResult struct {
	SessionID string
}

// Agent owns provider-specific settings, configuration, and session export.
// FileSystemConfiguration is embedded, so every agent exposes the same
// preparation seam.
type Agent interface {
	FileSystemConfiguration
	Type() console.AgentRuntimeType
	Capabilities() AgentCapabilities
	ResolveSettings(*agentrunv1.AgentRun) (Settings, error)
	Configure(context.Context, ConfigureRequest) error
	Export(context.Context, ExportRequest) (ExportResult, error)
}

// Transport owns one agent invocation protocol. Runtime serializes calls to
// Turn even when callers invoke FollowUpRun and BabysitRun concurrently. The
// transport must apply TurnRequest.Options to the initial execution so the
// controller's lifecycle hooks retain their existing behavior.
type Transport interface {
	Kind() TransportKind
	Capabilities() TransportCapabilities
	Turn(context.Context, TurnRequest, TurnSink) (TurnResult, error)
}
