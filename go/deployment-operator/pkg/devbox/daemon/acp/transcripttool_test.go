package acp

import (
	"encoding/json"
	"os"
	"testing"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

// The fixtures are pi-acp 0.0.33's updates for pi 0.84.1's subagent extension running scouts against a scripted
// model: each scout lists the directory with `ls`, then answers "child done".
func piUpdates(t *testing.T, name string) []Object {
	t.Helper()
	data, err := os.ReadFile("testdata/" + name)
	if err != nil {
		t.Fatal(err)
	}
	var out []Object
	if err := json.Unmarshal(data, &out); err != nil {
		t.Fatal(err)
	}
	return out
}

type childEntity struct {
	typ      devboxv1.EntityType
	id       string
	complete bool
}

func replayTranscript(t *testing.T, n Normalizer, updates []Object) (map[string][]childEntity, map[string]*Lineage, []Change) {
	t.Helper()
	children, lineages := map[string][]childEntity{}, map[string]*Lineage{}
	var parent []Change
	for _, u := range updates {
		for _, ch := range n.Normalize("sess", u) {
			if ch.SessionID == "sess" {
				parent = append(parent, ch)
				continue
			}
			children[ch.SessionID] = append(children[ch.SessionID], childEntity{ch.EntityType, ch.EntityID, ch.Complete})
			lineages[ch.SessionID] = ch.Subagent
		}
	}
	return children, lineages, parent
}

func TestTranscriptToolSingle(t *testing.T) {
	updates := piUpdates(t, "pi-subagent-single.json")
	call := Str(updates[0], "toolCallId")
	children, lineages, parent := replayTranscript(t, NewNormalizer(1, NoLineage{}, TranscriptTool("subagent")), updates)

	child := "sess" + SubagentSeparator + call + "/0"
	want := []childEntity{
		{devboxv1.EntityType_ENTITY_TYPE_USER_MESSAGE, "m0", true},
		{devboxv1.EntityType_ENTITY_TYPE_TOOL_CALL, "call_ls_2", false},
		{devboxv1.EntityType_ENTITY_TYPE_TOOL_CALL, "call_ls_2", true},
		{devboxv1.EntityType_ENTITY_TYPE_AGENT_MESSAGE, "m3-0", true},
	}
	if len(children) != 1 || len(children[child]) != len(want) {
		t.Fatalf("children %v", children)
	}
	for i, e := range want {
		if children[child][i] != e {
			t.Fatalf("entity %d: %v, want %v (each message lands once, however many snapshots repeat it)", i, children[child][i], e)
		}
	}
	l := lineages[child]
	if l.ParentSessionID != "sess" || l.ParentToolCallID != call || l.Title != "List the files" {
		t.Fatalf("lineage %+v", l)
	}
	for _, ch := range parent {
		if Has(Obj(ch.Patch, "rawOutput"), "details") || Has(Obj(ch.Payload, "rawOutput"), "details") {
			t.Fatal("the parent's tool call keeps the subagents' transcripts")
		}
	}
	if last := parent[len(parent)-1]; !last.Complete {
		t.Fatal("the subagent call's completion comes after its children's changes")
	}
}

func TestTranscriptToolEntities(t *testing.T) {
	updates := piUpdates(t, "pi-subagent-single.json")
	n := NewNormalizer(1, NoLineage{}, TranscriptTool("subagent"))
	got := map[string]Object{}
	for _, u := range updates {
		for _, ch := range n.Normalize("sess", u) {
			if ch.SessionID != "sess" {
				key := ch.EntityType.String() + "/" + ch.EntityID
				merged := got[key]
				if merged == nil {
					merged = Object{}
				}
				for k, v := range ch.Patch {
					merged[k] = v
				}
				got[key] = merged
			}
		}
	}
	text := func(o Object) string {
		return Str(Arr(o, "content")[0].(map[string]any), "text")
	}
	if text(got["ENTITY_TYPE_USER_MESSAGE/m0"]) != "Task: List the files" || text(got["ENTITY_TYPE_AGENT_MESSAGE/m3-0"]) != "child done" {
		t.Fatalf("messages %v", got)
	}
	tc := got["ENTITY_TYPE_TOOL_CALL/call_ls_2"]
	result := Obj(Arr(tc, "content")[0].(map[string]any), "content")
	if Str(tc, "title") != "ls" || Str(tc, "status") != StatusCompleted || Str(Obj(tc, "rawInput"), "path") != "." || Str(result, "text") != "(empty directory)" {
		t.Fatalf("tool call %v", tc)
	}
}

func TestTranscriptToolParallel(t *testing.T) {
	updates := piUpdates(t, "pi-subagent-parallel.json")
	call := Str(updates[0], "toolCallId")
	children, lineages, _ := replayTranscript(t, NewNormalizer(1, NoLineage{}, TranscriptTool("subagent")), updates)
	for i, task := range []string{"List the files", "Count the files"} {
		child := "sess" + SubagentSeparator + call + "/" + string(rune('0'+i))
		if len(children[child]) != 4 || lineages[child].Title != task {
			t.Fatalf("task %d: entities %v, lineage %+v", i, children[child], lineages[child])
		}
	}
	if len(children) != 2 {
		t.Fatalf("children %v", children)
	}
}

func TestTranscriptToolOnlyForItsTool(t *testing.T) {
	updates := piUpdates(t, "pi-subagent-single.json")
	children, _, parent := replayTranscript(t, NewNormalizer(1, NoLineage{}), updates)
	if len(children) != 0 || !Has(Obj(parent[len(parent)-1].Patch, "rawOutput"), "details") {
		t.Fatalf("without the option the tool call is left alone: %v", children)
	}
}
