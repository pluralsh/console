package acp

import (
	"strings"
)

// SubagentSeparator joins a parent session ID and the parent's spawning tool call ID into the ID of a v1 child
// session inferred from adapter `_meta`. v1 has no subagent sessions of its own, so the child ID is daemon-made.
const SubagentSeparator = "/subagent/"

// LineageExtractor infers subagent lineage for v1 adapters from their `_meta`. Implementations must only report
// lineage that the adapter states explicitly, never guess from content or timing (section 4.6a item 7).
type LineageExtractor interface {
	// Extract returns the child session an update belongs to, or nil when the update belongs to sessionID itself.
	Extract(sessionID string, update Object) *Lineage
}

// MetaPathExtractor reads a parent tool call ID from a fixed `_meta` path. Updates carrying it are routed to the
// child session `<session>/subagent/<parent tool call id>`.
type MetaPathExtractor struct {
	// Path inside `_meta`, e.g. ["claudeCode", "parentToolUseId"].
	Path []string
}

// Extract implements LineageExtractor.
func (e MetaPathExtractor) Extract(sessionID string, update Object) *Lineage {
	cur := Obj(update, "_meta")
	if cur == nil || len(e.Path) == 0 {
		return nil
	}
	for _, p := range e.Path[:len(e.Path)-1] {
		cur = Obj(cur, p)
		if cur == nil {
			return nil
		}
	}
	parentTool := strings.TrimSpace(Str(cur, e.Path[len(e.Path)-1]))
	if parentTool == "" {
		return nil
	}
	// The spawning tool call itself stays in the parent; only the child's own updates move.
	if Str(update, "toolCallId") == parentTool {
		return nil
	}
	return &Lineage{
		ParentSessionID:  sessionID,
		ChildSessionID:   sessionID + SubagentSeparator + parentTool,
		ParentToolCallID: parentTool,
	}
}

// NoLineage never reports lineage, for adapters whose `_meta` carries none.
type NoLineage struct{}

// Extract implements LineageExtractor.
func (NoLineage) Extract(string, Object) *Lineage { return nil }

// HiddenCalls is implemented by extractors whose adapter hides some tool calls behind native subagent sessions.
type HiddenCalls interface {
	// Hidden is whether a tool call update belongs to a call the adapter never shows as a tool call.
	Hidden(update Object) bool
}

// Known v1 lineage hints, keyed by adapter. claude-agent-acp tags the updates of Task subagents with the parent
// tool use ID; other v1 adapters expose nothing yet. DBX-02 confirms these against the pinned adapter versions.
var (
	ClaudeLineage LineageExtractor = claudeLineage{MetaPathExtractor{Path: []string{"claudeCode", "parentToolUseId"}}}
)

// claudeLineage is claude-agent-acp's. In native subagent mode it replaces the Agent (and legacy Task) tool call
// with the subagent's session but still sends the call's PostToolUse update ("async_launched") to the parent.
type claudeLineage struct{ MetaPathExtractor }

func (claudeLineage) Hidden(update Object) bool {
	switch Str(Obj(Obj(update, "_meta"), "claudeCode"), "toolName") {
	case "Agent", "Task":
		return true
	}
	return false
}
