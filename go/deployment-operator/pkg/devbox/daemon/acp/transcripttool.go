package acp

import (
	"strconv"
	"strings"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

// Option configures a Normalizer.
type Option func(*v1Normalizer)

// TranscriptTool names a tool whose streamed output is its subagents' transcripts: pi's subagent extension runs
// each subagent as its own `pi --mode json` process and reports, on every message, `rawOutput.details.results`
// with each subagent's task and every message so far. Each result becomes a child session under the tool call.
func TranscriptTool(name string) Option {
	return func(n *v1Normalizer) {
		n.transcriptTool = name
	}
}

// transcriptTitleLen bounds a subagent's title, taken from its task.
const transcriptTitleLen = 80

// transcriptChild is one subagent of a transcript tool call.
type transcriptChild struct {
	// messages is how many of the subagent's messages are already in its session; they only ever append.
	messages int
}

// transcriptCall reports whether a tool update belongs to a transcript tool call, remembering the call when it
// starts.
func (n *v1Normalizer) transcriptCall(session string, update Object) bool {
	if n.transcriptTool == "" {
		return false
	}
	key := session + SubagentSeparator + Str(update, "toolCallId")
	if Str(update, "sessionUpdate") == NewToolCall && Str(update, "title") == n.transcriptTool {
		n.transcriptCalls[key] = true
	}
	return n.transcriptCalls[key]
}

// transcriptChildren turns the subagents' new messages into changes on their child sessions, and drops the
// transcripts from the parent's copy of the tool call.
func (n *v1Normalizer) transcriptChildren(session string, patch Object) []Change {
	out := Obj(patch, "rawOutput")
	results := Arr(Obj(out, "details"), "results")
	if results == nil {
		return nil
	}
	trimmed := copyObject(out)
	delete(trimmed, "details")
	patch["rawOutput"] = trimmed

	toolCallID := Str(patch, "toolCallId")
	var changes []Change
	for i, r := range results {
		result, ok := r.(map[string]any)
		if !ok {
			continue
		}
		child := session + SubagentSeparator + toolCallID + "/" + strconv.Itoa(i)
		state := n.transcripts[child]
		if state == nil {
			state = &transcriptChild{}
			n.transcripts[child] = state
		}
		messages := Arr(result, "messages")
		if len(messages) <= state.messages {
			continue
		}
		lineage := &Lineage{
			ParentSessionID: session, ChildSessionID: child, ParentToolCallID: toolCallID,
			Title: transcriptTitle(result), Meta: Object{"pi": Object{"agent": Str(result, "agent")}},
		}
		for j := state.messages; j < len(messages); j++ {
			if msg, ok := messages[j].(map[string]any); ok {
				changes = append(changes, transcriptMessage(child, lineage, j, msg)...)
			}
		}
		state.messages = len(messages)
	}
	return changes
}

func transcriptTitle(result Object) string {
	title, _, _ := strings.Cut(strings.TrimSpace(Str(result, "task")), "\n")
	if r := []rune(title); len(r) > transcriptTitleLen {
		title = string(r[:transcriptTitleLen-1]) + "…"
	}
	if title == "" {
		title = Str(result, "agent")
	}
	return title
}

// transcriptMessage maps one pi message (user, assistant or toolResult) to entities.
func transcriptMessage(child string, lineage *Lineage, index int, msg Object) []Change {
	id := "m" + strconv.Itoa(index)
	switch Str(msg, "role") {
	case "user":
		return []Change{transcriptEntity(child, lineage, devboxv1.EntityType_ENTITY_TYPE_USER_MESSAGE, id,
			Object{"messageId": id, "content": textBlocks(msg["content"])}, true)}
	case "assistant":
		var changes []Change
		for k, p := range Arr(msg, "content") {
			part, ok := p.(map[string]any)
			if !ok {
				continue
			}
			partID := id + "-" + strconv.Itoa(k)
			switch Str(part, "type") {
			case TextType:
				changes = append(changes, transcriptEntity(child, lineage, devboxv1.EntityType_ENTITY_TYPE_AGENT_MESSAGE, partID,
					Object{"messageId": partID, "content": []any{map[string]any{"type": TextType, "text": Str(part, "text")}}}, true))
			case "thinking":
				changes = append(changes, transcriptEntity(child, lineage, devboxv1.EntityType_ENTITY_TYPE_AGENT_THOUGHT, partID,
					Object{"messageId": partID, "content": []any{map[string]any{"type": TextType, "text": Str(part, "thinking")}}}, true))
			case "toolCall":
				name := Str(part, "name")
				changes = append(changes, transcriptEntity(child, lineage, devboxv1.EntityType_ENTITY_TYPE_TOOL_CALL, Str(part, "id"),
					Object{"toolCallId": Str(part, "id"), "title": name, "kind": piToolKind(name), "status": "in_progress", "rawInput": part["arguments"]}, false))
			}
		}
		if text := Str(msg, "errorMessage"); text != "" {
			changes = append(changes, transcriptEntity(child, lineage, devboxv1.EntityType_ENTITY_TYPE_AGENT_MESSAGE, id+"-error",
				Object{"messageId": id + "-error", "content": []any{map[string]any{"type": TextType, "text": text}}}, true))
		}
		return changes
	case "toolResult":
		status := StatusCompleted
		if Bool(msg, "isError") {
			status = StatusFailed
		}
		var content []any
		for _, b := range textBlocks(msg["content"]) {
			content = append(content, map[string]any{"type": "content", "content": b})
		}
		toolCallID := Str(msg, "toolCallId")
		return []Change{transcriptEntity(child, lineage, devboxv1.EntityType_ENTITY_TYPE_TOOL_CALL, toolCallID,
			Object{"toolCallId": toolCallID, "status": status, "content": content}, true)}
	}
	return nil
}

func transcriptEntity(child string, lineage *Lineage, et devboxv1.EntityType, id string, patch Object, complete bool) Change {
	payload := copyObject(patch)
	payload["sessionUpdate"] = EntityUpdateName(et)
	return Change{
		Kind: ChangePatch, SessionID: child, Subagent: lineage, EntityType: et, EntityID: id,
		Patch: patch, Payload: payload, Complete: complete,
	}
}

// textBlocks keeps a pi message's text, given as a string or as content parts.
func textBlocks(content any) []any {
	if s, ok := content.(string); ok {
		return []any{map[string]any{"type": TextType, "text": s}}
	}
	var out []any
	for _, p := range asArray(content) {
		if part, ok := p.(map[string]any); ok && Str(part, "type") == TextType {
			out = append(out, map[string]any{"type": TextType, "text": Str(part, "text")})
		}
	}
	return out
}

func asArray(v any) []any {
	a, _ := v.([]any)
	return a
}

// piToolKind matches pi-acp's tool kinds.
func piToolKind(name string) string {
	switch name {
	case "read":
		return "read"
	case "write", "edit":
		return "edit"
	case "bash":
		return "execute"
	}
	return "other"
}
