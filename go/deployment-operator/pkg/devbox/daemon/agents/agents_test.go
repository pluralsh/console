package agents

import (
	"bufio"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"google.golang.org/protobuf/proto"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/acp"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/derr"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/fakeacp"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/harness"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/proc"
)

const (
	claude   = devboxv1.AgentType_AGENT_TYPE_CLAUDE
	instance = "inst-1"
	waitFor  = 10 * time.Second
)

type recorder struct {
	mu     sync.Mutex
	events []*devboxv1.DaemonEvent
}

func (r *recorder) Emit(ev *devboxv1.DaemonEvent) {
	r.mu.Lock()
	r.events = append(r.events, proto.Clone(ev).(*devboxv1.DaemonEvent))
	r.mu.Unlock()
}

func (r *recorder) snapshot() []*devboxv1.DaemonEvent {
	r.mu.Lock()
	defer r.mu.Unlock()
	return append([]*devboxv1.DaemonEvent(nil), r.events...)
}

// entities returns the settled entities of a session's timeline.
func (h *harnessT) entities(session string) map[string]*devboxv1.AcpEntity {
	out := map[string]*devboxv1.AcpEntity{}
	page, err := h.m.Timeline(context.Background(), &devboxv1.GetTimelineRequest{SessionId: session, Cursor: &devboxv1.GetTimelineRequest_AfterPosition{}, Limit: maxTimelinePage})
	if err != nil {
		return out
	}
	for _, e := range page.GetEntities() {
		if e.GetSettled() {
			out[e.GetKey().GetType().String()+"/"+e.GetKey().GetId()] = e
		}
	}
	return out
}

func (h *harnessT) agentText(session string) []string {
	var out []string
	for _, e := range h.entities(session) {
		if e.GetKey().GetType() != devboxv1.EntityType_ENTITY_TYPE_AGENT_MESSAGE {
			continue
		}
		var b strings.Builder
		for _, c := range e.GetMessage().GetContent() {
			b.WriteString(c.GetText().GetText())
		}
		out = append(out, b.String())
	}
	return out
}

type testLauncher struct{ log string }

func (l testLauncher) Spec(launch *devboxv1.AgentLaunch, _ *devboxv1.HarnessEndpoints, _ string) (*harness.Spec, error) {
	return &harness.Spec{Agent: launch.GetAgent(), Path: os.Args[0], Args: []string{"-test.run=^$"},
		Env: append(os.Environ(), fakeacp.EnvVar+"=1", fakeacp.LogEnv+"="+l.log), Lineage: acp.ClaudeLineage,
		Billing: launch.GetBilling()}, nil
}

type harnessT struct {
	m   *Manager
	rec *recorder
	log string
}

func newManager(t *testing.T, maxRunning int) *harnessT {
	t.Helper()
	return newManagerBilling(t, maxRunning, devboxv1.BillingMode_BILLING_MODE_PROXY)
}

func newManagerBilling(t *testing.T, maxRunning int, billing devboxv1.BillingMode) *harnessT {
	t.Helper()
	return newManagerWith(t, maxRunning, billing, nil)
}

func newManagerWith(t *testing.T, maxRunning int, billing devboxv1.BillingMode, configure func(*Options)) *harnessT {
	t.Helper()
	dir := t.TempDir()
	logPath := filepath.Join(dir, "agent.log")
	rec := &recorder{}
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	opts := Options{
		Home: filepath.Join(dir, "home"), StateDir: filepath.Join(dir, "state"), Emitter: rec,
		Launcher: testLauncher{log: logPath}, Supervisor: proc.NewSupervisor(log), Log: log, MaxRunning: maxRunning,
		Endpoints: func() *devboxv1.HarnessEndpoints {
			return &devboxv1.HarnessEndpoints{DevboxMcpUrl: "http://gateway/mcp", WorkbenchMcpUrl: "http://console/mcp"}
		},
	}
	if configure != nil {
		configure(&opts)
	}
	m := New(opts)
	if err := os.MkdirAll(filepath.Join(dir, "home"), 0o755); err != nil {
		t.Fatal(err)
	}
	m.Configure(instance, claude, "", nil, []*devboxv1.AgentLaunch{{Agent: claude, Billing: billing}}, maxRunning)
	if err := m.Start(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		m.Stop(ctx)
	})
	return &harnessT{m: m, rec: rec, log: logPath}
}

// calls returns the params of every request the fake agent received for a method.
func (h *harnessT) calls(t *testing.T, method string) []acp.Object {
	t.Helper()
	f, err := os.Open(h.log)
	if err != nil {
		return nil
	}
	defer f.Close()
	var out []acp.Object
	sc := bufio.NewScanner(f)
	sc.Buffer(make([]byte, 1<<20), 1<<20)
	for sc.Scan() {
		var line struct {
			Method string         `json:"method"`
			Params map[string]any `json:"params"`
		}
		if json.Unmarshal(sc.Bytes(), &line) == nil && line.Method == method {
			out = append(out, line.Params)
		}
	}
	return out
}

func eventually(t *testing.T, what string, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(waitFor)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatalf("timed out waiting for %s", what)
}

func text(s string) []*devboxv1.ContentBlock {
	return []*devboxv1.ContentBlock{{Block: &devboxv1.ContentBlock_Text{Text: &devboxv1.TextContent{Text: s}}}}
}

func (h *harnessT) create(t *testing.T, id string) *devboxv1.Session {
	t.Helper()
	s, err := h.m.CreateThread(context.Background(), &devboxv1.CreateThreadRequest{InstanceId: instance, ThreadId: id, Agent: claude, Title: id})
	if err != nil {
		t.Fatalf("create thread %s: %v", id, err)
	}
	return s
}

func (h *harnessT) prompt(t *testing.T, s *devboxv1.Session, promptID, msg string) *devboxv1.PromptResponse {
	t.Helper()
	resp, err := h.m.Prompt(context.Background(), &devboxv1.PromptRequest{
		Thread: &devboxv1.ThreadRef{InstanceId: instance, ThreadId: s.GetThreadId(), SessionId: s.GetSessionId()}, PromptId: promptID, Content: text(msg)})
	if err != nil {
		t.Fatalf("prompt %q: %v", msg, err)
	}
	return resp
}

func (h *harnessT) thread(id string) *devboxv1.Session {
	for _, s := range h.m.Threads() {
		if s.GetThreadId() == id {
			return s
		}
	}
	return nil
}

func (h *harnessT) idle(id string) bool {
	s := h.thread(id)
	return s != nil && s.GetForeground().GetState() == devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_IDLE
}

func contains(list []string, want string) bool {
	for _, s := range list {
		if strings.Contains(s, want) {
			return true
		}
	}
	return false
}

func TestSessionLifecycle(t *testing.T) {
	h := newManager(t, 4)
	s := h.create(t, "t1")
	if s.GetSessionId() == "" || s.GetStatus() != devboxv1.ThreadStatus_THREAD_STATUS_ACTIVE {
		t.Fatalf("unexpected session %v", s)
	}
	again := h.create(t, "t1")
	if again.GetSessionId() != s.GetSessionId() {
		t.Fatalf("CreateThread not idempotent: %s vs %s", again.GetSessionId(), s.GetSessionId())
	}
	if n := len(h.calls(t, acp.MethodSessionNew)); n != 1 {
		t.Fatalf("session/new called %d times", n)
	}

	// Per-thread MCP servers: the devbox MCP carries X-Devbox-Thread.
	news := h.calls(t, acp.MethodSessionNew)
	headers := map[string]map[string]string{}
	for _, srv := range acp.Arr(news[0], "mcpServers") {
		o := srv.(map[string]any)
		hs := map[string]string{}
		for _, hd := range acp.Arr(o, "headers") {
			ho := hd.(map[string]any)
			hs[acp.Str(ho, "name")] = acp.Str(ho, "value")
		}
		headers[acp.Str(o, "name")] = hs
	}
	if headers["devbox"][devboxv1.ThreadHeader] != "t1" {
		t.Fatalf("devbox MCP server without thread header: %v", news[0]["mcpServers"])
	}
	for _, name := range []string{"devbox", "plural-workbench"} {
		if headers[name]["Authorization"] != "Bearer "+harness.PlaceholderKey {
			t.Fatalf("%s MCP server without an Authorization placeholder: %v", name, headers[name])
		}
	}

	h.prompt(t, s, "p1", "hello")
	eventually(t, "echo", func() bool { return contains(h.agentText(s.GetSessionId()), "echo:hello") })
	eventually(t, "idle", func() bool { return h.idle("t1") })

	// The user message is an entity keyed by prompt ID.
	if _, ok := h.entities(s.GetSessionId())["ENTITY_TYPE_USER_MESSAGE/prompt-p1"]; !ok {
		t.Fatalf("user message entity missing: %v", h.entities(s.GetSessionId()))
	}

	list, err := h.m.ListThreads(context.Background(), true)
	if err != nil {
		t.Fatal(err)
	}
	if len(list.GetThreads()) != 1 {
		t.Fatalf("threads = %v", list.GetThreads())
	}
	imp := false
	for _, i := range list.GetImportable() {
		imp = imp || i.GetSessionId() == "external-1"
		if i.GetSessionId() == s.GetSessionId() {
			t.Fatalf("own thread listed as importable")
		}
	}
	if !imp {
		t.Fatalf("external session not importable: %v", list.GetImportable())
	}

	ref := &devboxv1.ThreadRef{InstanceId: instance, ThreadId: "t1"}
	closed, err := h.m.CloseThread(context.Background(), ref)
	if err != nil || closed.GetStatus() != devboxv1.ThreadStatus_THREAD_STATUS_CLOSED {
		t.Fatalf("close: %v %v", closed, err)
	}
	if len(h.calls(t, acp.MethodSessionClose)) != 1 {
		t.Fatalf("session/close not sent")
	}
	resumed, err := h.m.ResumeThread(context.Background(), ref, false)
	if err != nil || resumed.GetStatus() != devboxv1.ThreadStatus_THREAD_STATUS_ACTIVE {
		t.Fatalf("resume: %v %v", resumed, err)
	}
	deleted, agentSide, err := h.m.DeleteThread(context.Background(), ref)
	if err != nil || deleted.GetStatus() != devboxv1.ThreadStatus_THREAD_STATUS_DELETED || !agentSide {
		t.Fatalf("delete: %v %v %v", deleted, agentSide, err)
	}
}

func TestPromptIdempotency(t *testing.T) {
	h := newManager(t, 4)
	s := h.create(t, "t1")
	first := h.prompt(t, s, "p1", "hello")
	second := h.prompt(t, s, "p1", "hello")
	if first.GetDisposition() != devboxv1.PromptDisposition_PROMPT_DISPOSITION_SENT {
		t.Fatalf("first disposition %v", first.GetDisposition())
	}
	if second.GetDisposition() != devboxv1.PromptDisposition_PROMPT_DISPOSITION_DUPLICATE {
		t.Fatalf("second disposition %v", second.GetDisposition())
	}
	eventually(t, "echo", func() bool { return contains(h.agentText(s.GetSessionId()), "echo:hello") })
	eventually(t, "idle", func() bool { return h.idle("t1") })
	third := h.prompt(t, s, "p1", "hello")
	if third.GetDisposition() != devboxv1.PromptDisposition_PROMPT_DISPOSITION_DUPLICATE {
		t.Fatalf("replayed prompt after completion: %v", third.GetDisposition())
	}
	if n := len(h.calls(t, acp.MethodSessionPrompt)); n != 1 {
		t.Fatalf("session/prompt sent %d times", n)
	}
}

func TestQueueAndCancel(t *testing.T) {
	h := newManager(t, 4)
	s := h.create(t, "t1")
	h.prompt(t, s, "p1", "block")
	eventually(t, "running", func() bool {
		return h.thread("t1").GetForeground().GetState() == devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_RUNNING
	})
	if d := h.prompt(t, s, "p2", "after").GetDisposition(); d != devboxv1.PromptDisposition_PROMPT_DISPOSITION_QUEUED {
		t.Fatalf("prompt to a busy thread: %v", d)
	}
	ok, err := h.m.CancelPrompt(context.Background(), &devboxv1.ThreadRef{InstanceId: instance, ThreadId: "t1"})
	if err != nil || !ok {
		t.Fatalf("cancel: %v %v", ok, err)
	}
	eventually(t, "queued prompt to run", func() bool { return contains(h.agentText(s.GetSessionId()), "echo:after") })
	if len(h.calls(t, acp.MethodSessionCancel)) == 0 {
		t.Fatal("session/cancel not sent")
	}
}

func TestConcurrencyLimit(t *testing.T) {
	h := newManager(t, 2)
	var sessions []*devboxv1.Session
	for _, id := range []string{"a", "b", "c"} {
		sessions = append(sessions, h.create(t, id))
	}
	var dispositions []devboxv1.PromptDisposition
	for i, s := range sessions {
		dispositions = append(dispositions, h.prompt(t, s, "p"+s.GetThreadId(), "slow:400").GetDisposition())
		if i == 1 {
			eventually(t, "two running", func() bool { return len(h.calls(t, "_active")) >= 2 })
		}
	}
	if dispositions[2] != devboxv1.PromptDisposition_PROMPT_DISPOSITION_QUEUED {
		t.Fatalf("third prompt over the limit: %v", dispositions)
	}
	if st := h.thread("c").GetStatus(); st != devboxv1.ThreadStatus_THREAD_STATUS_WAITING {
		t.Fatalf("waiting thread status %v", st)
	}
	for _, s := range sessions {
		sid := s.GetSessionId()
		eventually(t, "turn "+sid, func() bool { return contains(h.agentText(sid), "slept 400") })
	}
	for _, a := range h.calls(t, "_active") {
		if n, _ := acp.Int(a, "n"); n > 2 {
			t.Fatalf("%d turns ran concurrently with a limit of 2", n)
		}
	}
	eventually(t, "c active again", func() bool { return h.thread("c").GetStatus() == devboxv1.ThreadStatus_THREAD_STATUS_ACTIVE })
}

func TestPermissionInteraction(t *testing.T) {
	h := newManager(t, 4)
	s := h.create(t, "t1")
	h.prompt(t, s, "p1", "permission")
	var in *devboxv1.Interaction
	eventually(t, "pending interaction", func() bool {
		for _, i := range h.m.Interactions() {
			in = i
			return true
		}
		return false
	})
	if in.GetKind() != devboxv1.InteractionKind_INTERACTION_KIND_PERMISSION || len(in.GetPermission().GetOptions()) != 2 ||
		in.GetToolCallId() != "tc-perm" || in.GetThreadId() != "t1" {
		t.Fatalf("unexpected interaction %v", in)
	}
	if st := h.thread("t1").GetForeground().GetState(); st != devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_REQUIRES_ACTION {
		t.Fatalf("foreground while waiting for permission: %v", st)
	}
	resp := &devboxv1.InteractionResponse{Response: &devboxv1.InteractionResponse_Permission{
		Permission: &devboxv1.PermissionOutcome{Outcome: &devboxv1.PermissionOutcome_SelectedOptionId{SelectedOptionId: "allow"}}}}
	if _, err := h.m.RespondInteraction(&devboxv1.RespondInteractionRequest{InteractionId: in.GetInteractionId(), Response: resp}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "outcome", func() bool { return contains(h.agentText(s.GetSessionId()), "outcome:selected:allow") })
	_, err := h.m.RespondInteraction(&devboxv1.RespondInteractionRequest{InteractionId: in.GetInteractionId(), Response: resp})
	if derr.Reason(err) != devboxv1.ErrorReason_ERROR_REASON_STALE_REVISION {
		t.Fatalf("second answer: %v", err)
	}
	// The permission's tool call is part of the timeline.
	if _, ok := h.entities(s.GetSessionId())["ENTITY_TYPE_TOOL_CALL/tc-perm"]; !ok {
		eventually(t, "tool call entity", func() bool {
			h.m.SettleAll()
			_, ok := h.entities(s.GetSessionId())["ENTITY_TYPE_TOOL_CALL/tc-perm"]
			return ok
		})
	}
}

func TestResolvingAfterTheTurnEndedLeavesTheThreadIdle(t *testing.T) {
	h := newManager(t, 4)
	s := h.create(t, "t1")
	h.prompt(t, s, "p1", "permission")
	eventually(t, "pending interaction", func() bool { return len(h.m.Interactions()) > 0 })

	h.m.mu.Lock()
	for _, in := range h.m.interactions {
		in.session.thread.running = false
		h.m.resolveInteractionLocked(in, devboxv1.InteractionState_INTERACTION_STATE_CANCELLED, nil, nil)
	}
	h.m.mu.Unlock()
	if st := h.thread("t1").GetForeground().GetState(); st != devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_IDLE {
		t.Fatalf("foreground after the last interaction resolved on an ended turn: %v", st)
	}
}

func TestActivityAloneReemitsTheRowOnlyEveryInterval(t *testing.T) {
	h := newManager(t, 4)
	s := h.create(t, "t1")
	h.m.Flush()
	rows := func() int {
		n := 0
		for _, ev := range h.rec.snapshot() {
			if ev.GetSession().GetThreadId() == "t1" {
				n++
			}
		}
		return n
	}
	before := rows()
	bump := func(d time.Duration) {
		h.m.mu.Lock()
		sess := h.m.sessions[s.GetSessionId()]
		sess.lastActivity = sess.reportedActivity.Add(d)
		h.m.mu.Unlock()
		h.m.Flush()
	}

	bump(time.Second)
	if got := rows(); got != before {
		t.Fatalf("activity within the interval emitted %d rows", got-before)
	}
	bump(activityInterval)
	if got := rows(); got != before+1 {
		t.Fatalf("activity past the interval emitted %d rows, want 1", got-before)
	}
}

func TestSubagentLineage(t *testing.T) {
	h := newManager(t, 4)
	s := h.create(t, "t1")
	h.prompt(t, s, "p1", "subagent")
	child := s.GetSessionId() + acp.SubagentSeparator + "task-1"
	eventually(t, "child message", func() bool { return contains(h.agentText(child), "child says hi") })
	eventually(t, "parent message", func() bool { return contains(h.agentText(s.GetSessionId()), "parent done") })
	if contains(h.agentText(s.GetSessionId()), "child says hi") {
		t.Fatal("child update leaked into the parent session")
	}
	if _, ok := h.entities(s.GetSessionId())["ENTITY_TYPE_TOOL_CALL/task-1"]; !ok {
		t.Fatal("spawning tool call missing from the parent")
	}
	h.m.Flush()
	var row *devboxv1.Session
	for _, ev := range h.rec.snapshot() {
		if r := ev.GetSession(); r != nil && r.GetSessionId() == child {
			row = r
		}
	}
	if row == nil || row.GetKind() != devboxv1.SessionKind_SESSION_KIND_SUBAGENT || row.GetParentSessionId() != s.GetSessionId() || row.GetThreadId() != "" {
		t.Fatalf("subagent session row %v", row)
	}
}

func TestEntityFidelity(t *testing.T) {
	h := newManager(t, 4)
	s := h.create(t, "t1")
	h.prompt(t, s, "p1", "unknown")
	var block *devboxv1.UnknownVariant
	var widget *devboxv1.AcpEntity
	eventually(t, "entities", func() bool {
		if !h.idle("t1") || len(h.calls(t, acp.MethodSessionPrompt)) == 0 {
			return false
		}
		h.m.SettleAll()
		for _, e := range h.entities(s.GetSessionId()) {
			for _, c := range e.GetMessage().GetContent() {
				if u := c.GetUnknown(); u != nil {
					block = u
				}
			}
			if u := e.GetUnknown(); u != nil && u.GetType() == "future_widget" {
				widget = e
			}
		}
		return block != nil && widget != nil
	})
	var raw map[string]any
	if err := json.Unmarshal(block.GetRawJson(), &raw); err != nil || raw["shape"] != "cube" || raw["type"] != "hologram" {
		t.Fatalf("unknown content block not preserved: %s", block.GetRawJson())
	}
	if err := json.Unmarshal(widget.GetUnknown().GetRawJson(), &raw); err != nil {
		t.Fatal(err)
	}
	if p, _ := raw["payload"].(map[string]any); p == nil || p["nested"] == nil {
		t.Fatalf("unknown update not preserved: %s", widget.GetUnknown().GetRawJson())
	}
	if !widget.GetSettled() || widget.GetPosition() == 0 {
		t.Fatalf("unknown entity not settled/positioned: %v", widget)
	}
}

func TestModelSwitchUsesConfigOption(t *testing.T) {
	h := newManager(t, 4)
	s := h.create(t, "t1")
	ref := &devboxv1.ThreadRef{InstanceId: instance, ThreadId: "t1", SessionId: s.GetSessionId()}
	opts, err := h.m.SetThreadConfigOption(context.Background(), ref, &devboxv1.ConfigOptionSetting{ConfigId: "model", Value: "smart"})
	if err != nil {
		t.Fatal(err)
	}
	cur := ""
	for _, o := range opts {
		if o.GetId() == "model" {
			cur = o.GetCurrentValue()
		}
	}
	if cur != "smart" {
		t.Fatalf("model after switch %q", cur)
	}
	calls := h.calls(t, acp.MethodSetConfigOption)
	if len(calls) != 1 || acp.Str(calls[0], "configId") != "model" || acp.Str(calls[0], "value") != "smart" {
		t.Fatalf("set_config_option calls %v", calls)
	}
	if _, err := h.m.SetThreadConfigOption(context.Background(), ref, &devboxv1.ConfigOptionSetting{ConfigId: "model", Value: "nonexistent"}); err == nil {
		t.Fatal("invalid model accepted")
	}
	if len(h.calls(t, acp.MethodSetConfigOption)) != 1 {
		t.Fatal("invalid value was sent to the agent")
	}
}

func TestSlashCommands(t *testing.T) {
	h := newManager(t, 4)
	s := h.create(t, "t1")
	ref := &devboxv1.ThreadRef{InstanceId: instance, ThreadId: "t1"}
	eventually(t, "commands", func() bool {
		cmds, err := h.m.ListCommands(ref, "")
		return err == nil && len(cmds) == 1 && cmds[0].GetName() == "review"
	})
	h.prompt(t, s, "p1", "/review focus on tests")
	eventually(t, "echo", func() bool { return contains(h.agentText(s.GetSessionId()), "echo:/review focus on tests") })
	prompts := h.calls(t, acp.MethodSessionPrompt)
	blocks := acp.Arr(prompts[0], "prompt")
	if len(blocks) != 1 || acp.Str(blocks[0].(map[string]any), "text") != "/review focus on tests" {
		t.Fatalf("slash command not sent verbatim: %v", blocks)
	}
}

func TestAgentAuthFailureIsTyped(t *testing.T) {
	h := newManager(t, 4)
	s := h.create(t, "t1")
	h.prompt(t, s, "p1", "authfail")
	eventually(t, "failed turn", func() bool {
		fg := h.thread("t1").GetForeground()
		return fg.GetError().GetDetail().GetReason() == devboxv1.ErrorReason_ERROR_REASON_AGENT_AUTH_FAILED
	})
}

func TestHistoryIsServedFromTheTranscript(t *testing.T) {
	h := newManager(t, 4)
	s := h.create(t, "t1")
	h.prompt(t, s, "p1", "hello")
	eventually(t, "echo", func() bool { return contains(h.agentText(s.GetSessionId()), "echo:hello") })
	eventually(t, "idle", func() bool { return h.idle("t1") })

	// Settled entities stop being event log records: they go to the transcript on the next flush.
	for _, ev := range h.rec.snapshot() {
		if d := ev.GetDelta(); d == nil && ev.GetSession() == nil && ev.GetAggregate() == nil && ev.GetInteraction() == nil {
			t.Fatalf("unexpected event log record %v", ev)
		}
	}
	h.m.Flush()
	stored, err := h.m.opts.Transcript.Timeline(context.Background(), s.GetSessionId(), 0, 100, nil)
	if err != nil {
		t.Fatal(err)
	}
	keys := map[string]bool{}
	for _, e := range stored.Entities {
		keys[e.GetKey().GetType().String()+"/"+e.GetKey().GetId()] = true
	}
	if !keys["ENTITY_TYPE_USER_MESSAGE/prompt-p1"] || len(stored.Entities) < 2 {
		t.Fatalf("transcript after flush: %v", keys)
	}

	sessions := h.m.Sessions()
	if len(sessions.GetSessions()) != 1 || sessions.GetSessions()[0].GetThreadId() != "t1" || len(sessions.GetConnections()) != 1 {
		t.Fatalf("sessions = %v", sessions)
	}

	// A snapshot restored as a new instance starts with no history.
	h.m.Forget()
	if got := h.entities(s.GetSessionId()); len(got) != 0 {
		t.Fatalf("entities after Forget: %v", got)
	}
	if got := h.m.Sessions().GetSessions(); len(got) != 0 {
		t.Fatalf("sessions after Forget: %v", got)
	}
}
