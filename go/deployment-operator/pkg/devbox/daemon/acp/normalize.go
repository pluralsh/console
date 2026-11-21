package acp

import (
	"encoding/json"
	"strings"
	"sync"

	"github.com/google/uuid"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

// ChangeKind says how a normalized change applies.
type ChangeKind int

const (
	// ChangeAppend appends a chunk's content block to a message-like entity.
	ChangeAppend ChangeKind = iota + 1
	// ChangePatch upserts fields on an entity: omitted unchanged, null clears, values replace.
	ChangePatch
	// ChangeState is session state (state_update, config options, commands, session info, usage).
	ChangeState
	// ChangeNotice is a live-only notice; never stored.
	ChangeNotice
)

// State kinds carried by ChangeState (DeltaOp STATE `state_kind`).
const (
	StateUpdate             = "state_update"
	StateConfigOptionUpdate = "config_option_update"
	StateCommandsUpdate     = "available_commands_update"
	StateSessionInfoUpdate  = "session_info_update"
	StateUsageUpdate        = "usage_update"
	// StateCurrentModeUpdate is v1-only; the session layer folds it into the mode config option.
	StateCurrentModeUpdate = "current_mode_update"
)

// Terminal statuses shared by tool calls and native subagents.
const (
	StatusCompleted = "completed"
	StatusFailed    = "failed"
)

// Change is one normalized, v2-shaped change to a session.
type Change struct {
	Kind ChangeKind
	// SessionID is the session the change belongs to after lineage routing (a subagent's for child updates).
	SessionID  string
	EntityType devboxv1.EntityType
	EntityID   string
	// Patch holds the fields to upsert (ChangePatch) or, for ChangeAppend, the chunk with "content" set to the
	// appended block.
	Patch Object
	// StateKind and Payload describe a ChangeState or ChangeNotice. Payload is the v2-shaped update.
	StateKind string
	// Payload is the v2-shaped update sent as the live delta's payload_json.
	Payload Object
	// Complete marks the end of the entity's own lifecycle (a tool call reaching completed/failed), which settles
	// it immediately.
	Complete bool
	// Subagent is set when lineage routed the change to a child session.
	Subagent *Lineage
	// SubagentAnnouncement is a v2 subagent_update: a child session appeared.
	SubagentAnnouncement *Lineage
}

// Lineage links a child (subagent) session to its parent.
type Lineage struct {
	ParentSessionID string
	ChildSessionID  string
	// ParentToolCallID is the parent's tool call that spawned the child, when known.
	ParentToolCallID string
	Title            string
	Meta             Object
}

// entityKind maps a v2 entity type to its sessionUpdate name and ID field.
var entityKinds = map[devboxv1.EntityType]struct{ update, idField string }{
	devboxv1.EntityType_ENTITY_TYPE_USER_MESSAGE:    {"user_message", "messageId"},
	devboxv1.EntityType_ENTITY_TYPE_AGENT_MESSAGE:   {"agent_message", "messageId"},
	devboxv1.EntityType_ENTITY_TYPE_AGENT_THOUGHT:   {"agent_thought", "messageId"},
	devboxv1.EntityType_ENTITY_TYPE_SESSION_MESSAGE: {"session_message", "messageId"},
	devboxv1.EntityType_ENTITY_TYPE_TOOL_CALL:       {"tool_call_update", "toolCallId"},
	devboxv1.EntityType_ENTITY_TYPE_PLAN:            {"plan_update", "planId"},
	devboxv1.EntityType_ENTITY_TYPE_TERMINAL:        {"terminal_update", "terminalId"},
	devboxv1.EntityType_ENTITY_TYPE_COMPACTION:      {"compaction_update", "compactionId"},
	devboxv1.EntityType_ENTITY_TYPE_UNKNOWN:         {"", "id"},
}

// EntityUpdateName is the v2 sessionUpdate discriminator for an entity type.
func EntityUpdateName(t devboxv1.EntityType) string { return entityKinds[t].update }

// EntityIDField is the ACP ID field name for an entity type.
func EntityIDField(t devboxv1.EntityType) string { return entityKinds[t].idField }

var chunkKinds = map[string]devboxv1.EntityType{
	"user_message_chunk":  devboxv1.EntityType_ENTITY_TYPE_USER_MESSAGE,
	"agent_message_chunk": devboxv1.EntityType_ENTITY_TYPE_AGENT_MESSAGE,
	"agent_thought_chunk": devboxv1.EntityType_ENTITY_TYPE_AGENT_THOUGHT,
}

// Normalizer turns raw session/update notifications into v2 changes. One Normalizer serves one ACP connection;
// it tracks contiguous chunk runs and per-turn plan IDs per session.
type Normalizer interface {
	Normalize(sessionID string, update Object) []Change
	// TurnStarted resets per-turn state (chunk runs, the v1 synthetic plan ID) for a session.
	TurnStarted(sessionID string)
	// ProtocolVersion is the negotiated ACP version this normalizer serves.
	ProtocolVersion() int
}

// NewNormalizer returns the normalizer for a negotiated protocol version.
func NewNormalizer(version int, lineage LineageExtractor) Normalizer {
	base := &v1Normalizer{lineage: lineage, runs: map[string]*run{}, plans: map[string]string{}, native: map[string]bool{}}
	if version >= 2 {
		return &v2Normalizer{v1: base}
	}
	return base
}

type run struct {
	kind devboxv1.EntityType
	id   string
}

type v1Normalizer struct {
	lineage LineageExtractor
	mu      sync.Mutex
	runs    map[string]*run
	plans   map[string]string
	// native holds the child sessions the agent announced with subagent_spawned. Their updates arrive on the
	// child's own session ID, so lineage tags on them must not nest another child.
	native map[string]bool
}

func (n *v1Normalizer) ProtocolVersion() int { return 1 }

func (n *v1Normalizer) TurnStarted(sessionID string) {
	n.mu.Lock()
	defer n.mu.Unlock()
	for k := range n.runs {
		if k == sessionID || strings.HasPrefix(k, sessionID+SubagentSeparator) {
			delete(n.runs, k)
		}
	}
	for k := range n.plans {
		if k == sessionID || strings.HasPrefix(k, sessionID+SubagentSeparator) {
			delete(n.plans, k)
		}
	}
}

// SyntheticID returns a daemon-synthesized entity ID. IDs are random so they never collide with entities already
// in the session's transcript, even across daemon restarts.
func SyntheticID(prefix string) string {
	return prefix + "-" + strings.ReplaceAll(uuid.NewString(), "-", "")[:16]
}

func (n *v1Normalizer) route(sessionID string, update Object) (string, *Lineage) {
	if n.lineage == nil || n.native[sessionID] {
		return sessionID, nil
	}
	l := n.lineage.Extract(sessionID, update)
	if l == nil {
		return sessionID, nil
	}
	return l.ChildSessionID, l
}

func (n *v1Normalizer) Normalize(sessionID string, update Object) []Change {
	n.mu.Lock()
	defer n.mu.Unlock()
	kind := Str(update, "sessionUpdate")
	target, lineage := n.route(sessionID, update)
	if et, ok := chunkKinds[kind]; ok {
		return []Change{n.chunk(target, lineage, et, update)}
	}
	// Any non-chunk update ends the current contiguous chunk run.
	delete(n.runs, target)
	switch kind {
	case "tool_call", "tool_call_update":
		patch := withoutDiscriminator(update)
		id := Str(update, "toolCallId")
		payload := copyObject(patch)
		payload["sessionUpdate"] = "tool_call_update"
		status := Str(update, "status")
		return []Change{{
			Kind: ChangePatch, SessionID: target, Subagent: lineage,
			EntityType: devboxv1.EntityType_ENTITY_TYPE_TOOL_CALL, EntityID: id, Patch: patch, Payload: payload,
			Complete: status == StatusCompleted || status == StatusFailed,
		}}
	case "plan", "plan_update", "plan_removed":
		patch := withoutDiscriminator(update)
		id := Str(update, "planId")
		if id == "" {
			id = n.plans[target]
			if id == "" {
				id = SyntheticID("plan")
				n.plans[target] = id
			}
			patch["planId"] = id
		}
		if kind == "plan_removed" {
			patch["removed"] = true
		}
		payload := copyObject(patch)
		payload["sessionUpdate"] = "plan_update"
		return []Change{{
			Kind: ChangePatch, SessionID: target, Subagent: lineage,
			EntityType: devboxv1.EntityType_ENTITY_TYPE_PLAN, EntityID: id, Patch: patch, Payload: payload,
		}}
	case StateCommandsUpdate:
		payload := copyObject(update)
		var cmds []any
		for _, c := range Arr(update, "availableCommands") {
			if co, ok := c.(map[string]any); ok {
				cmds = append(cmds, NormalizeCommandJSON(co))
			}
		}
		payload["availableCommands"] = cmds
		return []Change{{Kind: ChangeState, SessionID: target, Subagent: lineage, StateKind: kind, Payload: payload}}
	case StateConfigOptionUpdate, StateSessionInfoUpdate, StateUsageUpdate, StateCurrentModeUpdate:
		return []Change{{Kind: ChangeState, SessionID: target, Subagent: lineage, StateKind: kind, Payload: copyObject(update)}}
	case SubagentSpawned:
		if changes := n.subagentSpawned(sessionID, update); changes != nil {
			return changes
		}
		return []Change{unknownChange(target, lineage, update)}
	case SubagentStateUpdate:
		return n.subagentFinished(update)
	default:
		return []Change{unknownChange(target, lineage, update)}
	}
}

func unknownChange(session string, lineage *Lineage, update Object) Change {
	id := SyntheticID("unknown")
	patch := copyObject(update)
	payload := copyObject(update)
	return Change{
		Kind: ChangePatch, SessionID: session, Subagent: lineage,
		EntityType: devboxv1.EntityType_ENTITY_TYPE_UNKNOWN, EntityID: id, Patch: patch, Payload: payload, Complete: true,
	}
}

func (n *v1Normalizer) chunk(session string, lineage *Lineage, et devboxv1.EntityType, update Object) Change {
	id := Str(update, "messageId")
	if id == "" {
		r := n.runs[session]
		if r == nil || r.kind != et {
			r = &run{kind: et, id: SyntheticID("msg")}
			n.runs[session] = r
		}
		id = r.id
	} else {
		n.runs[session] = &run{kind: et, id: id}
	}
	chunk := copyObject(update)
	chunk["messageId"] = id
	return Change{
		Kind: ChangeAppend, SessionID: session, Subagent: lineage,
		EntityType: et, EntityID: id, Patch: chunk, Payload: chunk,
	}
}

// v2Normalizer handles the ACP v2 entity model (draft). v2 updates are already entities keyed by type and ID, so
// most pass through; anything unrecognized is kept raw as an UNKNOWN entity. It falls back to the v1 rules for
// updates that keep their v1 shape (chunks without IDs, config, commands, session info, usage).
//
// v2 support is behind the box's acpV2 flag and is not yet verified against a released adapter (DBX-02).
type v2Normalizer struct {
	v1 *v1Normalizer
}

func (n *v2Normalizer) ProtocolVersion() int         { return 2 }
func (n *v2Normalizer) TurnStarted(sessionID string) { n.v1.TurnStarted(sessionID) }

var v2EntityUpdates = map[string]devboxv1.EntityType{
	"user_message":      devboxv1.EntityType_ENTITY_TYPE_USER_MESSAGE,
	"agent_message":     devboxv1.EntityType_ENTITY_TYPE_AGENT_MESSAGE,
	"agent_thought":     devboxv1.EntityType_ENTITY_TYPE_AGENT_THOUGHT,
	"session_message":   devboxv1.EntityType_ENTITY_TYPE_SESSION_MESSAGE,
	"tool_call_update":  devboxv1.EntityType_ENTITY_TYPE_TOOL_CALL,
	"plan_update":       devboxv1.EntityType_ENTITY_TYPE_PLAN,
	"terminal_update":   devboxv1.EntityType_ENTITY_TYPE_TERMINAL,
	"compaction_update": devboxv1.EntityType_ENTITY_TYPE_COMPACTION,
}

func (n *v2Normalizer) Normalize(sessionID string, update Object) []Change {
	kind := Str(update, "sessionUpdate")
	switch kind {
	case StateUpdate:
		return []Change{{Kind: ChangeState, SessionID: sessionID, StateKind: StateUpdate, Payload: copyObject(update)}}
	case "notice":
		return []Change{{Kind: ChangeNotice, SessionID: sessionID, Payload: copyObject(update)}}
	case "subagent_update":
		child := Str(update, "sessionId")
		if child == "" {
			child = Str(update, "subagentSessionId")
		}
		parent := Str(update, "parentSessionId")
		if parent == "" {
			parent = sessionID
		}
		return []Change{{
			Kind: ChangeState, SessionID: parent, StateKind: "subagent_update", Payload: copyObject(update),
			SubagentAnnouncement: &Lineage{ParentSessionID: parent, ChildSessionID: child, ParentToolCallID: Str(update, "toolCallId"), Title: Str(update, "title"), Meta: Obj(update, "_meta")},
		}}
	}
	if et, ok := v2EntityUpdates[kind]; ok {
		id := Str(update, EntityIDField(et))
		if id == "" {
			return []Change{unknownChange(sessionID, nil, update)}
		}
		patch := withoutDiscriminator(update)
		status := Str(update, "status")
		return []Change{{
			Kind: ChangePatch, SessionID: sessionID, EntityType: et, EntityID: id, Patch: patch, Payload: copyObject(update),
			Complete: (et == devboxv1.EntityType_ENTITY_TYPE_TOOL_CALL && (status == "completed" || status == "failed")) ||
				(et == devboxv1.EntityType_ENTITY_TYPE_TERMINAL && Has(update, "exitStatus")),
		}}
	}
	return n.v1.Normalize(sessionID, update)
}

func withoutDiscriminator(o Object) Object {
	out := copyObject(o)
	delete(out, "sessionUpdate")
	return out
}

func copyObject(o Object) Object {
	out := make(Object, len(o))
	for k, v := range o {
		out[k] = v
	}
	return out
}

// CloneJSON deep-copies a decoded JSON value.
func CloneJSON(v any) any {
	switch t := v.(type) {
	case map[string]any:
		out := make(map[string]any, len(t))
		for k, vv := range t {
			out[k] = CloneJSON(vv)
		}
		return out
	case []any:
		out := make([]any, len(t))
		for i, vv := range t {
			out[i] = CloneJSON(vv)
		}
		return out
	default:
		return t
	}
}

// RawObject is a convenience for tests and callers holding raw JSON.
func RawObject(raw json.RawMessage) Object {
	o, err := DecodeObject(raw)
	if err != nil {
		return Object{}
	}
	return o
}
