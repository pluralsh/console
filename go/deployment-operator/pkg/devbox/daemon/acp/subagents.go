package acp

import devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"

// Native subagent updates (claude-agent-acp with the `subagents` client capability). Both arrive on the parent
// session; the child's own updates then arrive on the child's session ID.
const (
	SubagentSpawned     = "subagent_spawned"
	SubagentStateUpdate = "subagent_state_update"
)

// SubagentSpawnPrefix prefixes the ID of the parent's session message that marks where a native subagent started.
const SubagentSpawnPrefix = "spawn-"

// subagentSpawned announces the child and records its task twice: as a session message in the parent, which the
// transcript replaces with the subagent's card, and as the child's opening user message, since the agent never
// streams the prompt into the child itself.
func (n *v1Normalizer) subagentSpawned(parent string, update Object) []Change {
	child := Str(update, "subagentSessionId")
	if child == "" {
		return nil
	}
	n.native[child] = true
	var content []any
	if task := Str(update, "task"); task != "" {
		content = []any{map[string]any{"type": TextType, "text": task}}
	}
	anchorID := SubagentSpawnPrefix + child
	anchor := Object{"messageId": anchorID, "fromSessionId": parent, "toSessionId": child, "content": content}
	anchorPayload := copyObject(anchor)
	anchorPayload["sessionUpdate"] = EntityUpdateName(devboxv1.EntityType_ENTITY_TYPE_SESSION_MESSAGE)
	spawn := Change{
		Kind: ChangePatch, SessionID: parent, EntityType: devboxv1.EntityType_ENTITY_TYPE_SESSION_MESSAGE, EntityID: anchorID,
		Patch: anchor, Payload: anchorPayload, Complete: true,
		SubagentAnnouncement: &Lineage{ParentSessionID: parent, ChildSessionID: child, Title: Str(update, "name"), Meta: Obj(update, "_meta")},
	}
	if content == nil {
		return []Change{spawn}
	}
	taskID := "task-" + child
	task := Object{"messageId": taskID, "content": content}
	taskPayload := copyObject(task)
	taskPayload["sessionUpdate"] = EntityUpdateName(devboxv1.EntityType_ENTITY_TYPE_USER_MESSAGE)
	return []Change{spawn, {
		Kind: ChangePatch, SessionID: child, EntityType: devboxv1.EntityType_ENTITY_TYPE_USER_MESSAGE, EntityID: taskID,
		Patch: task, Payload: taskPayload, Complete: true,
	}}
}

// subagentFinished idles a native child. Updates for a child this connection never announced are dropped, so they
// can't land on (and idle) the parent.
func (n *v1Normalizer) subagentFinished(update Object) []Change {
	child := Str(update, "subagentSessionId")
	if !n.native[child] {
		return nil
	}
	stopReason := "end_turn"
	switch Str(update, "state") {
	case StatusCompleted:
	case StatusFailed:
		stopReason = "error"
	case "cancelled", "disconnected":
		stopReason = "cancelled"
	default:
		return nil
	}
	return []Change{{
		Kind: ChangeState, SessionID: child, StateKind: StateUpdate,
		Payload: Object{"sessionUpdate": StateUpdate, "state": "idle", "stopReason": stopReason},
	}}
}
