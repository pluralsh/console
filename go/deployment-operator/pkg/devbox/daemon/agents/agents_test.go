package agents

import (
	"bufio"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net"
	"os"
	"path/filepath"
	"slices"
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
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/transcript"
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
		NativeSubagents: true, Billing: launch.GetBilling()}, nil
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
	if row.GetParentToolCallId() != "task-1" || row.GetTitle() != "Explore the repo" {
		t.Fatalf("subagent not tied to its spawning call: tool call %q, title %q", row.GetParentToolCallId(), row.GetTitle())
	}
	if row.GetForeground().GetState() != devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_IDLE {
		t.Fatalf("subagent still %v after its spawning call completed", row.GetForeground().GetState())
	}
}

func TestSubagentPermissionBelongsToTheSubagent(t *testing.T) {
	h := newManager(t, 4)
	s := h.create(t, "t1")
	h.prompt(t, s, "p1", "subagent-permission")
	child := s.GetSessionId() + acp.SubagentSeparator + "task-1"
	var in *devboxv1.Interaction
	eventually(t, "pending interaction", func() bool {
		for _, i := range h.m.Interactions() {
			in = i
			return true
		}
		return false
	})
	if in.GetSessionId() != child || in.GetThreadId() != "t1" {
		t.Fatalf("subagent's permission filed under session %q, thread %q", in.GetSessionId(), in.GetThreadId())
	}
	if _, ok := h.entities(s.GetSessionId())["ENTITY_TYPE_TOOL_CALL/tc-child"]; ok {
		t.Fatal("the subagent's call leaked into the parent transcript")
	}
	resp := &devboxv1.InteractionResponse{Response: &devboxv1.InteractionResponse_Permission{
		Permission: &devboxv1.PermissionOutcome{Outcome: &devboxv1.PermissionOutcome_SelectedOptionId{SelectedOptionId: "allow"}}}}
	if _, err := h.m.RespondInteraction(&devboxv1.RespondInteractionRequest{InteractionId: in.GetInteractionId(), Response: resp}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "outcome", func() bool { return contains(h.agentText(s.GetSessionId()), "outcome:selected:allow") })
}

// specLauncher adjusts the fake agent's launch.
type specLauncher struct {
	testLauncher
	adjust func(*harness.Spec)
}

func (l specLauncher) Spec(launch *devboxv1.AgentLaunch, endpoints *devboxv1.HarnessEndpoints, model string) (*harness.Spec, error) {
	spec, err := l.testLauncher.Spec(launch, endpoints, model)
	if err != nil {
		return nil, err
	}
	l.adjust(spec)
	return spec, nil
}

func newManagerAdjusting(t *testing.T, adjust func(*harness.Spec)) *harnessT {
	t.Helper()
	return newManagerWith(t, 4, devboxv1.BillingMode_BILLING_MODE_PROXY, func(o *Options) {
		o.Launcher = specLauncher{testLauncher: o.Launcher.(testLauncher), adjust: adjust}
	})
}

func TestPiTranscriptSubagents(t *testing.T) {
	fixture, err := filepath.Abs("../acp/testdata/pi-subagent-parallel.json")
	if err != nil {
		t.Fatal(err)
	}
	h := newManagerAdjusting(t, func(s *harness.Spec) { s.TranscriptTool = "subagent" })
	s := h.create(t, "t1")
	h.prompt(t, s, "p1", "replay:"+fixture)
	eventually(t, "replayed", func() bool { return contains(h.agentText(s.GetSessionId()), "replayed") })
	h.m.Flush()
	rows := map[string]*devboxv1.Session{}
	for _, ev := range h.rec.snapshot() {
		if r := ev.GetSession(); r != nil && r.GetKind() == devboxv1.SessionKind_SESSION_KIND_SUBAGENT {
			rows[r.GetSessionId()] = r
		}
	}
	if len(rows) != 2 {
		t.Fatalf("subagent sessions %v", rows)
	}
	for id, r := range rows {
		if r.GetParentSessionId() != s.GetSessionId() || r.GetParentToolCallId() != "call_subagent_1" ||
			r.GetForeground().GetState() != devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_IDLE {
			t.Fatalf("subagent %s: %v", id, r)
		}
		if !contains(h.agentText(id), "child done") {
			t.Fatalf("subagent %s text %v", id, h.agentText(id))
		}
	}
}

func TestOpenCodeTaskSubagent(t *testing.T) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	addr := l.Addr().String()
	_ = l.Close()
	h := newManagerAdjusting(t, func(s *harness.Spec) {
		s.Env = append(s.Env, fakeacp.OpenCodeEnv+"="+addr, "OPENCODE_SERVER_PASSWORD=pw")
		s.OpenCodeServer = &harness.OpenCodeServer{URL: "http://" + addr, Username: "opencode", Password: "pw"}
	})
	s := h.create(t, "t1")
	h.prompt(t, s, "p1", "opencode-subagent")
	child := fakeacp.OpenCodeChild
	var in *devboxv1.Interaction
	eventually(t, "the subagent's permission request", func() bool {
		for _, i := range h.m.Interactions() {
			in = i
			return true
		}
		return contains(h.agentText(s.GetSessionId()), "child never opened")
	})
	if in == nil {
		t.Fatalf("the child was never opened: %v", h.agentText(s.GetSessionId()))
	}
	if in.GetSessionId() != child || in.GetThreadId() != "t1" {
		t.Fatalf("subagent's permission filed under session %q, thread %q", in.GetSessionId(), in.GetThreadId())
	}
	resp := &devboxv1.InteractionResponse{Response: &devboxv1.InteractionResponse_Permission{
		Permission: &devboxv1.PermissionOutcome{Outcome: &devboxv1.PermissionOutcome_SelectedOptionId{SelectedOptionId: "once"}}}}
	if _, err := h.m.RespondInteraction(&devboxv1.RespondInteractionRequest{InteractionId: in.GetInteractionId(), Response: resp}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "outcome", func() bool { return contains(h.agentText(s.GetSessionId()), "outcome:selected:once") })

	if !contains(h.agentText(child), "child says hi") {
		t.Fatalf("child text %v", h.agentText(child))
	}
	if task := h.entities(child)["ENTITY_TYPE_USER_MESSAGE/task-"+child]; task.GetMessage().GetContent()[0].GetText().GetText() != "Find the entrypoints" {
		t.Fatalf("child doesn't open with its task: %v", task)
	}
	for _, r := range h.calls(t, acp.MethodSessionResume) {
		if acp.Str(r, "sessionId") == child && len(acp.Arr(r, "mcpServers")) != 0 {
			t.Fatalf("child opened with the thread's MCP servers: %v", r)
		}
	}
	h.m.Flush()
	var row *devboxv1.Session
	for _, ev := range h.rec.snapshot() {
		if r := ev.GetSession(); r != nil && r.GetSessionId() == child {
			row = r
		}
	}
	if row == nil || row.GetKind() != devboxv1.SessionKind_SESSION_KIND_SUBAGENT || row.GetParentSessionId() != s.GetSessionId() ||
		row.GetParentToolCallId() != "call-task" || row.GetTitle() != "Explore the repo" {
		t.Fatalf("subagent session row %v", row)
	}
	if row.GetForeground().GetState() != devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_IDLE {
		t.Fatalf("the finished task didn't idle its child: %v", row.GetForeground())
	}
}

func TestNativeSubagentSession(t *testing.T) {
	h := newManager(t, 4)
	s := h.create(t, "t1")
	init := h.calls(t, acp.MethodInitialize)
	if len(init) == 0 {
		t.Fatal("no initialize")
	}
	caps := acp.Obj(init[0], "clientCapabilities")
	air := acp.Obj(acp.Obj(acp.Obj(caps, "_meta"), "jetbrains"), "air")
	if acp.Obj(caps, "subagents") == nil || !slices.Contains(acp.Arr(air, "capabilities"), any("nativeSubagentSessions")) {
		t.Fatalf("initialize didn't advertise native subagents both ways: %v", caps)
	}
	h.prompt(t, s, "p1", "native-subagent")
	const child = "task-native"
	var in *devboxv1.Interaction
	eventually(t, "pending interaction", func() bool {
		for _, i := range h.m.Interactions() {
			in = i
			return true
		}
		return false
	})
	if in.GetSessionId() != child || in.GetThreadId() != "t1" {
		t.Fatalf("subagent's permission filed under session %q, thread %q", in.GetSessionId(), in.GetThreadId())
	}
	if cmd := in.GetPermission().GetToolCall().GetRawInput().GetStructValue().GetFields()["command"].GetStringValue(); cmd != "ls -la" {
		t.Fatalf("permission request lost the command from the earlier tool_call: %v", in.GetPermission().GetToolCall())
	}
	resp := &devboxv1.InteractionResponse{Response: &devboxv1.InteractionResponse_Permission{
		Permission: &devboxv1.PermissionOutcome{Outcome: &devboxv1.PermissionOutcome_SelectedOptionId{SelectedOptionId: "allow"}}}}
	if _, err := h.m.RespondInteraction(&devboxv1.RespondInteractionRequest{InteractionId: in.GetInteractionId(), Response: resp}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "outcome", func() bool { return contains(h.agentText(s.GetSessionId()), "outcome:selected:allow") })

	if !contains(h.agentText(child), "child says hi") || contains(h.agentText(s.GetSessionId()), "child says hi") {
		t.Fatalf("child text: child %v, parent %v", h.agentText(child), h.agentText(s.GetSessionId()))
	}
	task := h.entities(child)["ENTITY_TYPE_USER_MESSAGE/task-"+child]
	if task.GetMessage().GetContent()[0].GetText().GetText() != "Find the entrypoints" {
		t.Fatalf("child doesn't open with its task: %v", task)
	}
	anchor := h.entities(s.GetSessionId())["ENTITY_TYPE_SESSION_MESSAGE/"+acp.SubagentSpawnPrefix+child]
	if anchor.GetSessionMessage().GetToSessionId() != child || anchor.GetSessionMessage().GetFromSessionId() != s.GetSessionId() {
		t.Fatalf("parent has no anchor for the subagent: %v", anchor)
	}
	h.m.Flush()
	var row *devboxv1.Session
	for _, ev := range h.rec.snapshot() {
		if r := ev.GetSession(); r != nil {
			if strings.Contains(r.GetSessionId(), acp.SubagentSeparator) {
				t.Fatalf("lineage tags on the child's own updates nested another session: %s", r.GetSessionId())
			}
			if r.GetSessionId() == child {
				row = r
			}
		}
	}
	if row == nil || row.GetKind() != devboxv1.SessionKind_SESSION_KIND_SUBAGENT || row.GetParentSessionId() != s.GetSessionId() || row.GetTitle() != "Explore the repo" {
		t.Fatalf("subagent session row %v", row)
	}
	if row.GetForeground().GetState() != devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_IDLE || row.GetForeground().GetStopReason() != "end_turn" {
		t.Fatalf("subagent_state_update didn't finish the child: %v", row.GetForeground())
	}

	// Reattaching replays every child's history onto its own session; the transcript already has it.
	h.m.StopAgents(func(devboxv1.AgentType, devboxv1.BillingMode) bool { return true })
	if _, err := h.m.ResumeThread(context.Background(), &devboxv1.ThreadRef{InstanceId: instance, ThreadId: "t1"}, false); err != nil {
		t.Fatal(err)
	}
	if got := h.agentText(child); strings.Count(strings.Join(got, ""), "child says hi") != 1 {
		t.Fatalf("replay re-appended the child's history: %v", got)
	}
	h.m.mu.Lock()
	unseen := h.m.sessions["task-unseen"]
	h.m.mu.Unlock()
	if unseen != nil {
		t.Fatal("replay created a child the transcript never had")
	}
}

func TestDeltasAreNumberedPerSession(t *testing.T) {
	fixture, err := filepath.Abs("../acp/testdata/claude-native-subagent.json")
	if err != nil {
		t.Fatal(err)
	}
	h := newManager(t, 4)
	s := h.create(t, "t1")
	h.prompt(t, s, "p1", "replay:"+fixture)
	eventually(t, "replayed", func() bool { return contains(h.agentText(s.GetSessionId()), "replayed") })
	h.m.Flush()

	last := map[string]uint64{}
	var stream string
	for _, ev := range h.rec.snapshot() {
		d := ev.GetDelta()
		if d == nil {
			continue
		}
		if d.GetOp() == devboxv1.DeltaOp_DELTA_OP_NOTICE {
			if d.GetSeq() != 0 {
				t.Fatalf("notice numbered: %v", d)
			}
			continue
		}
		if stream == "" {
			stream = d.GetStream()
		}
		if d.GetStream() == "" || d.GetStream() != stream {
			t.Fatalf("delta stream %q, want %q", d.GetStream(), stream)
		}
		if d.GetSeq() != last[d.GetSessionId()]+1 {
			t.Fatalf("session %s: seq %d after %d", d.GetSessionId(), d.GetSeq(), last[d.GetSessionId()])
		}
		last[d.GetSessionId()] = d.GetSeq()
	}
	if len(last) < 2 {
		t.Fatalf("expected deltas for the thread and its subagent: %v", last)
	}
	for session, seq := range last {
		page, err := h.m.Timeline(context.Background(), &devboxv1.GetTimelineRequest{SessionId: session})
		if err != nil {
			t.Fatal(err)
		}
		if page.GetSeq() != seq || page.GetStream() != stream {
			t.Fatalf("session %s timeline at seq %d/%s, its deltas at %d/%s", session, page.GetSeq(), page.GetStream(), seq, stream)
		}
	}
}

// TestClaudeNativeSubagentCapture replays claude-agent-acp 0.75.1 running an async Agent subagent in native mode.
func TestClaudeNativeSubagentCapture(t *testing.T) {
	fixture, err := filepath.Abs("../acp/testdata/claude-native-subagent.json")
	if err != nil {
		t.Fatal(err)
	}
	h := newManager(t, 4)
	s := h.create(t, "t1")
	h.prompt(t, s, "p1", "replay:"+fixture)
	eventually(t, "replayed", func() bool { return contains(h.agentText(s.GetSessionId()), "replayed") })
	const child = "a0aa9e5d37e932105"
	if !contains(h.agentText(child), "child done") || contains(h.agentText(s.GetSessionId()), "child done") {
		t.Fatalf("child text: child %v, parent %v", h.agentText(child), h.agentText(s.GetSessionId()))
	}
	parent := h.entities(s.GetSessionId())
	if _, ok := parent["ENTITY_TYPE_TOOL_CALL/toolu_parent_2"]; ok {
		t.Fatal("the hidden Agent call's update surfaced in the parent as a bare tool call")
	}
	if _, ok := parent["ENTITY_TYPE_SESSION_MESSAGE/"+acp.SubagentSpawnPrefix+child]; !ok {
		t.Fatalf("parent has no anchor for the subagent: %v", parent)
	}
	if _, ok := h.entities(child)["ENTITY_TYPE_TOOL_CALL/toolu_child_4"]; !ok {
		t.Fatalf("the child's own tool call is missing: %v", h.entities(child))
	}
	h.m.Flush()
	var row *devboxv1.Session
	for _, ev := range h.rec.snapshot() {
		if r := ev.GetSession(); r != nil {
			if strings.Contains(r.GetSessionId(), acp.SubagentSeparator) {
				t.Fatalf("lineage tags nested another session: %s", r.GetSessionId())
			}
			if r.GetSessionId() == child {
				row = r
			}
		}
	}
	if row == nil || row.GetKind() != devboxv1.SessionKind_SESSION_KIND_SUBAGENT || row.GetParentSessionId() != s.GetSessionId() || row.GetTitle() != "Explore files" {
		t.Fatalf("subagent session row %v", row)
	}
	if row.GetForeground().GetState() != devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_IDLE {
		t.Fatalf("the completed subagent is still %v", row.GetForeground())
	}
}

func TestQueuedPromptsSurviveARestart(t *testing.T) {
	qp := &queuedPrompt{
		promptID: "p1", messageID: promptMessageID("p1"), queuedAt: time.Unix(100, 0).UTC(),
		sentBy: &devboxv1.Principal{UserId: "u1"},
		content: []*devboxv1.ContentBlock{
			{Block: &devboxv1.ContentBlock_Text{Text: &devboxv1.TextContent{Text: "hi"}}},
			{Block: &devboxv1.ContentBlock_ResourceLink{ResourceLink: &devboxv1.ResourceLink{Uri: "file:///a.png", Name: "a.png"}}},
		},
	}
	got := restorePrompt(persistPrompt(qp))
	if !proto.Equal(got.proto(), qp.proto()) || got.messageID != qp.messageID {
		t.Fatalf("restored %v, want %v", got.proto(), qp.proto())
	}
}

// A restarted daemon (resume after suspend, or after a crash that left threads.json behind the transcript) keeps
// placing new entities after the ones already in the transcript, so later turns don't interleave with earlier ones.
func TestPositionsStayAfterTheTranscriptAcrossRestarts(t *testing.T) {
	for _, tc := range []struct {
		name  string
		crash bool
	}{{"clean stop", false}, {"stale state", true}} {
		t.Run(tc.name, func(t *testing.T) {
			dir := t.TempDir()
			home := filepath.Join(dir, "home")
			if err := os.MkdirAll(home, 0o755); err != nil {
				t.Fatal(err)
			}
			tr := transcript.Memory()
			shared := func(o *Options) { o.StateDir, o.Home, o.Transcript = filepath.Join(dir, "state"), home, tr }

			h := newManagerWith(t, 2, devboxv1.BillingMode_BILLING_MODE_PROXY, shared)
			s := h.create(t, "t1")
			h.prompt(t, s, "p1", "first")
			eventually(t, "first reply", func() bool { return contains(h.agentText(s.GetSessionId()), "echo:first") })
			eventually(t, "idle", func() bool { return h.idle("t1") })
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			h.m.Stop(ctx)

			if tc.crash {
				path := filepath.Join(dir, "state", "threads.json")
				var st persistedState
				raw, err := os.ReadFile(path)
				if err != nil || json.Unmarshal(raw, &st) != nil {
					t.Fatalf("reading state: %v", err)
				}
				st.Threads[0].Session.NextPosition = 1
				raw, _ = json.Marshal(st)
				if err := os.WriteFile(path, raw, 0o600); err != nil {
					t.Fatal(err)
				}
			}

			h = newManagerWith(t, 2, devboxv1.BillingMode_BILLING_MODE_PROXY, shared)
			h.prompt(t, s, "p2", "second")
			eventually(t, "second reply", func() bool { return contains(h.agentText(s.GetSessionId()), "echo:second") })

			entities := h.entities(s.GetSessionId())
			byPosition := map[uint64]string{}
			var firstTurn uint64
			for key, e := range entities {
				if prev, ok := byPosition[e.GetPosition()]; ok {
					t.Fatalf("%s and %s share position %d", prev, key, e.GetPosition())
				}
				byPosition[e.GetPosition()] = key
				var body strings.Builder
				for _, c := range e.GetMessage().GetContent() {
					body.WriteString(c.GetText().GetText())
				}
				if !strings.Contains(body.String(), "second") {
					firstTurn = max(firstTurn, e.GetPosition())
				}
			}
			if p := entities["ENTITY_TYPE_USER_MESSAGE/prompt-p2"].GetPosition(); p <= firstTurn {
				t.Fatalf("the second prompt is at %d, inside the first turn (through %d): %v", p, firstTurn, byPosition)
			}
		})
	}
}

func TestQueuedPromptsAreShownAndEditable(t *testing.T) {
	h := newManager(t, 4)
	s := h.create(t, "t1")
	ref := &devboxv1.ThreadRef{InstanceId: instance, ThreadId: "t1"}
	h.prompt(t, s, "p1", "block")
	eventually(t, "running", func() bool {
		return h.thread("t1").GetForeground().GetState() == devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_RUNNING
	})
	h.prompt(t, s, "p2", "second")
	h.prompt(t, s, "p3", "third")
	h.prompt(t, s, "p4", "fourth")
	queued := func() []string {
		h.m.Flush()
		var ids []string
		for _, qp := range h.thread("t1").GetQueuedPrompts() {
			ids = append(ids, qp.GetPromptId()+":"+qp.GetContent()[0].GetText().GetText())
		}
		return ids
	}
	if got := queued(); !slices.Equal(got, []string{"p2:second", "p3:third", "p4:fourth"}) {
		t.Fatalf("queued prompts on the row: %v", got)
	}

	update := func(id string, action devboxv1.QueuedPromptAction, text string) *devboxv1.UpdateQueuedPromptResponse {
		resp, err := h.m.UpdateQueuedPrompt(context.Background(), &devboxv1.UpdateQueuedPromptRequest{Thread: ref, PromptId: id, Action: action, Text: text})
		if err != nil {
			t.Fatal(err)
		}
		return resp
	}
	update("p2", devboxv1.QueuedPromptAction_QUEUED_PROMPT_ACTION_EDIT, "edited")
	update("p4", devboxv1.QueuedPromptAction_QUEUED_PROMPT_ACTION_CANCEL, "")
	if got := queued(); !slices.Equal(got, []string{"p2:edited", "p3:third"}) {
		t.Fatalf("after edit and cancel: %v", got)
	}
	if _, err := h.m.UpdateQueuedPrompt(context.Background(), &devboxv1.UpdateQueuedPromptRequest{
		Thread: ref, PromptId: "p2", Action: devboxv1.QueuedPromptAction_QUEUED_PROMPT_ACTION_EDIT, Text: "  ",
	}); err == nil {
		t.Fatal("emptied a queued prompt")
	}

	// Send now jumps the queue and interrupts the running turn.
	update("p3", devboxv1.QueuedPromptAction_QUEUED_PROMPT_ACTION_SEND_NOW, "")
	eventually(t, "promoted prompt to run", func() bool { return contains(h.agentText(s.GetSessionId()), "echo:third") })
	if len(h.calls(t, acp.MethodSessionCancel)) == 0 {
		t.Fatal("send now didn't cancel the running turn")
	}
	eventually(t, "rest of the queue", func() bool { return contains(h.agentText(s.GetSessionId()), "echo:edited") })
	if contains(h.agentText(s.GetSessionId()), "echo:fourth") {
		t.Fatal("cancelled prompt ran")
	}
	if got := queued(); len(got) != 0 {
		t.Fatalf("queue after it drained: %v", got)
	}
	if resp := update("p2", devboxv1.QueuedPromptAction_QUEUED_PROMPT_ACTION_CANCEL, ""); resp.GetUpdated() {
		t.Fatal("updated a prompt that already ran")
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
