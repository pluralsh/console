package logz

// These constants are for type-safe zap field helpers that are not here to:
// - avoid adding a dependency or
// - because they are not generally useful.
// Field names are here to make it possible to see all field names that are in use.

const (
	AgentConfig = "agent_config"
	ApplyEvent  = "apply_event"
)
