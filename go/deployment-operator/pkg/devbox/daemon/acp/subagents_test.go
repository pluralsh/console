package acp

import "testing"

func TestSubagentStateUpdateForAnUnannouncedChildIsDropped(t *testing.T) {
	n := NewNormalizer(1, ClaudeLineage)
	if got := n.Normalize("parent", Object{"sessionUpdate": SubagentStateUpdate, "subagentSessionId": "nope", "state": "completed"}); len(got) != 0 {
		t.Fatalf("finished a child nobody announced: %+v", got)
	}
}

func TestSubagentTerminalStates(t *testing.T) {
	for state, want := range map[string]string{"completed": "end_turn", "failed": "error", "cancelled": "cancelled", "disconnected": "cancelled"} {
		n := NewNormalizer(1, ClaudeLineage)
		n.Normalize("parent", Object{"sessionUpdate": SubagentSpawned, "subagentSessionId": "c1", "name": "n"})
		got := n.Normalize("parent", Object{"sessionUpdate": SubagentStateUpdate, "subagentSessionId": "c1", "state": state})
		if len(got) != 1 || got[0].SessionID != "c1" || got[0].StateKind != StateUpdate || Str(got[0].Payload, "stopReason") != want {
			t.Fatalf("%s: %+v", state, got)
		}
	}
}

func TestNativeChildUpdatesIgnoreLineageTags(t *testing.T) {
	n := NewNormalizer(1, ClaudeLineage)
	tagged := Object{"sessionUpdate": "agent_message_chunk", "content": map[string]any{"type": "text", "text": "hi"},
		"_meta": map[string]any{"claudeCode": map[string]any{"parentToolUseId": "toolu-1"}}}
	if got := n.Normalize("parent", Object{"sessionUpdate": SubagentSpawned, "subagentSessionId": "c1"}); len(got) != 1 || got[0].SubagentAnnouncement == nil {
		t.Fatalf("a spawn without a task is just the announcement: %+v", got)
	}
	if got := n.Normalize("c1", tagged); got[0].SessionID != "c1" || got[0].Subagent != nil {
		t.Fatalf("native child update re-routed: %+v", got[0])
	}
	if got := n.Normalize("parent", tagged); got[0].SessionID != "parent"+SubagentSeparator+"toolu-1" {
		t.Fatalf("legacy lineage stopped working: %+v", got[0])
	}
}
