package agents

import (
	"encoding/json"
	"time"

	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/types/known/timestamppb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/acp"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/internal/fsutil"
)

// maxRememberedPrompts bounds the prompt IDs kept per thread for idempotency.
const maxRememberedPrompts = 512

type queuedPrompt struct {
	promptID  string
	messageID string
	content   []*devboxv1.ContentBlock
	sentBy    *devboxv1.Principal
	queuedAt  time.Time
}

// proto is the queued prompt as shown to console: its text and attachment links. Inline image data is left out,
// it duplicates the attachment's link.
func (qp *queuedPrompt) proto() *devboxv1.QueuedPrompt {
	out := &devboxv1.QueuedPrompt{PromptId: qp.promptID, SentBy: qp.sentBy, QueuedAt: timestamppb.New(qp.queuedAt)}
	for _, b := range qp.content {
		if b.GetText() != nil || b.GetResourceLink() != nil {
			out.Content = append(out.Content, b)
		}
	}
	return out
}

// withText replaces a prompt's text blocks with text, keeping its other blocks (attachments) after it.
func withText(content []*devboxv1.ContentBlock, text string) []*devboxv1.ContentBlock {
	var out []*devboxv1.ContentBlock
	if text != "" {
		out = append(out, &devboxv1.ContentBlock{Block: &devboxv1.ContentBlock_Text{Text: &devboxv1.TextContent{Text: text}}})
	}
	for _, b := range content {
		if b.GetText() == nil {
			out = append(out, b)
		}
	}
	return out
}

// thread is a console thread: a top-level ACP session plus its prompt queue.
type thread struct {
	id        string
	agent     devboxv1.AgentType
	session   *session
	cwd       string
	worktrees []string
	createdBy *devboxv1.Principal
	createdAt time.Time
	title     string
	imported  bool
	closed    bool
	deleted   bool
	model     string
	autonomy  devboxv1.Autonomy
	// lowering is set while the thread's mode is being reset to the runner's autonomy cap.
	lowering bool

	queue      []*queuedPrompt
	running    bool
	waiting    bool
	turnCancel func()
	prompts    map[string]string
	promptIDs  []string
	// recentPrompts are the text of the last few prompts, context for the reviewer; not persisted.
	recentPrompts []string

	rev   uint64
	dirty bool
}

func (t *thread) open() bool { return !t.closed && !t.deleted }

func (t *thread) status() devboxv1.ThreadStatus {
	switch {
	case t.deleted:
		return devboxv1.ThreadStatus_THREAD_STATUS_DELETED
	case t.closed:
		return devboxv1.ThreadStatus_THREAD_STATUS_CLOSED
	case t.waiting:
		return devboxv1.ThreadStatus_THREAD_STATUS_WAITING
	default:
		return devboxv1.ThreadStatus_THREAD_STATUS_ACTIVE
	}
}

func (t *thread) displayTitle() string {
	if t.session != nil && t.session.title != "" {
		return t.session.title
	}
	if t.title != "" {
		return t.title
	}
	return t.id
}

func (t *thread) queuedProtos() []*devboxv1.QueuedPrompt {
	out := make([]*devboxv1.QueuedPrompt, 0, len(t.queue))
	for _, qp := range t.queue {
		out = append(out, qp.proto())
	}
	return out
}

func (t *thread) queuedIndex(promptID string) int {
	for i, qp := range t.queue {
		if qp.promptID == promptID {
			return i
		}
	}
	return -1
}

func (t *thread) rememberPrompt(promptID, messageID string) {
	if t.prompts == nil {
		t.prompts = map[string]string{}
	}
	t.prompts[promptID] = messageID
	t.promptIDs = append(t.promptIDs, promptID)
	for len(t.promptIDs) > maxRememberedPrompts {
		delete(t.prompts, t.promptIDs[0])
		t.promptIDs = t.promptIDs[1:]
	}
}

// cfgOption is a normalized session config option. synthetic is "model" or "mode" when the daemon built it from
// v1's `models` / `modes` fields, which are changed with session/set_model / session/set_mode, and "autonomy"
// for the daemon's own autonomy option.
type cfgOption struct {
	raw       acp.Object
	synthetic string
}

func (o *cfgOption) proto() *devboxv1.ConfigOption { return acp.ConfigOptionOf(o.raw) }
func (o *cfgOption) id() string                    { return acp.Str(o.raw, "id") }
func (o *cfgOption) category() string              { return acp.Str(o.raw, "category") }

// session is an ACP session: a thread's or a subagent's.
type session struct {
	id     string
	kind   devboxv1.SessionKind
	parent string
	agent  devboxv1.AgentType
	thread *thread
	cwd    string
	title  string
	meta   acp.Object
	// parentToolCall is the parent's tool call that spawned a subagent, when the agent says which.
	parentToolCall string
	store          *acp.Store
	options        []*cfgOption
	// modeView replaces the mode option in reported options: its values within the runner's autonomy cap, or
	// hidden (an empty object) when autonomy covers every mode. Nil reports the mode option as is.
	modeView acp.Object
	// noAuto are the models the agent fell back from its auto mode on (Claude models without Auto support).
	noAuto map[string]bool
	// modeUpdates counts current_mode_updates, so a set_mode call can tell the agent reported a different mode.
	modeUpdates int
	// commands are the latest available_commands_update, normalized to v2 shapes.
	commands   []*devboxv1.AvailableCommand
	foreground *devboxv1.ForegroundState
	usage      *devboxv1.Usage

	createdAt    time.Time
	lastActivity time.Time
	// reportedActivity is the lastActivity of the last emitted row: activity alone re-emits the row only every
	// activityInterval.
	reportedActivity time.Time
	// attached is whether the session is open on the agent's current connection process.
	attached bool
	// replaying suppresses entities while session/load replays history the transcript already has.
	replaying bool

	rev   uint64
	dirty bool
}

func (s *session) configProtos() []*devboxv1.ConfigOption {
	out := make([]*devboxv1.ConfigOption, 0, len(s.options))
	for _, raw := range s.reported() {
		out = append(out, acp.ConfigOptionOf(raw))
	}
	return out
}

func (s *session) configJSON() []any {
	out := make([]any, 0, len(s.options))
	for _, raw := range s.reported() {
		out = append(out, raw)
	}
	return out
}

// reported are the options as shown to console, with the mode option replaced by modeView.
func (s *session) reported() []acp.Object {
	out := make([]acp.Object, 0, len(s.options))
	for _, o := range s.options {
		switch {
		case o.category() != modeCategory || s.modeView == nil:
			out = append(out, o.raw)
		case len(s.modeView) > 0:
			out = append(out, s.modeView)
		}
	}
	return out
}

type interaction struct {
	proto   *devboxv1.Interaction
	session *session
	resp    chan *devboxv1.InteractionResponse
	// reviewing is set while the daemon's reviewer judges the request; it isn't shown to humans until it's done.
	reviewing bool
}

// ---------------------------------------------------------------------------------------------------------------
// Persistence (~/.plural/threads.json). Transcript content lives in ~/.plural/transcripts; this is only what the
// daemon needs to re-attach threads after a cold boot and keep positions, revisions and prompt idempotency
// monotonic.
// ---------------------------------------------------------------------------------------------------------------

type persistedSession struct {
	ID           string          `json:"id"`
	Kind         int32           `json:"kind"`
	Parent       string          `json:"parent,omitempty"`
	Agent        int32           `json:"agent"`
	Cwd          string          `json:"cwd"`
	Title        string          `json:"title,omitempty"`
	ParentTool   string          `json:"parentToolCall,omitempty"`
	NextPosition uint64          `json:"nextPosition"`
	Revision     uint64          `json:"revision"`
	Options      []acp.Object    `json:"options,omitempty"`
	Synthetic    []string        `json:"synthetic,omitempty"`
	Commands     json.RawMessage `json:"commands,omitempty"`
	CreatedAt    time.Time       `json:"createdAt"`
	LastActivity time.Time       `json:"lastActivity"`
}

type persistedThread struct {
	ID        string            `json:"id"`
	Agent     int32             `json:"agent"`
	Session   *persistedSession `json:"session,omitempty"`
	Cwd       string            `json:"cwd"`
	Worktrees []string          `json:"worktrees,omitempty"`
	CreatedBy json.RawMessage   `json:"createdBy,omitempty"`
	CreatedAt time.Time         `json:"createdAt"`
	Title     string            `json:"title,omitempty"`
	Imported  bool              `json:"imported,omitempty"`
	Closed    bool              `json:"closed,omitempty"`
	Deleted   bool              `json:"deleted,omitempty"`
	Model     string            `json:"model,omitempty"`
	Autonomy  int32             `json:"autonomy,omitempty"`
	Revision  uint64            `json:"revision"`
	PromptIDs []string          `json:"promptIds,omitempty"`
	Messages  []string          `json:"messages,omitempty"`
	Queue     []persistedPrompt `json:"queue,omitempty"`
}

type persistedPrompt struct {
	PromptID  string            `json:"promptId"`
	MessageID string            `json:"messageId"`
	Content   []json.RawMessage `json:"content"`
	SentBy    json.RawMessage   `json:"sentBy,omitempty"`
	QueuedAt  time.Time         `json:"queuedAt"`
}

func persistPrompt(qp *queuedPrompt) persistedPrompt {
	pp := persistedPrompt{PromptID: qp.promptID, MessageID: qp.messageID, QueuedAt: qp.queuedAt}
	for _, b := range qp.content {
		raw, _ := protojson.Marshal(b)
		pp.Content = append(pp.Content, raw)
	}
	if qp.sentBy != nil {
		pp.SentBy, _ = protojson.Marshal(qp.sentBy)
	}
	return pp
}

func restorePrompt(pp persistedPrompt) *queuedPrompt {
	qp := &queuedPrompt{promptID: pp.PromptID, messageID: pp.MessageID, queuedAt: pp.QueuedAt}
	for _, raw := range pp.Content {
		b := &devboxv1.ContentBlock{}
		if protojson.Unmarshal(raw, b) == nil {
			qp.content = append(qp.content, b)
		}
	}
	if len(pp.SentBy) > 0 {
		p := &devboxv1.Principal{}
		if protojson.Unmarshal(pp.SentBy, p) == nil {
			qp.sentBy = p
		}
	}
	return qp
}

type persistedInteraction struct {
	Proto json.RawMessage `json:"proto"`
}

type persistedState struct {
	Threads      []persistedThread      `json:"threads"`
	Subagents    []persistedSession     `json:"subagents,omitempty"`
	Interactions []persistedInteraction `json:"interactions,omitempty"`
	AggRevision  uint64                 `json:"aggRevision"`
}

func persistSession(s *session) *persistedSession {
	ps := &persistedSession{
		ID: s.id, Kind: int32(s.kind), Parent: s.parent, Agent: int32(s.agent), Cwd: s.cwd, Title: s.title, ParentTool: s.parentToolCall,
		NextPosition: s.store.NextPosition(), Revision: s.rev, CreatedAt: s.createdAt, LastActivity: s.lastActivity,
	}
	for _, o := range s.options {
		ps.Options = append(ps.Options, o.raw)
		ps.Synthetic = append(ps.Synthetic, o.synthetic)
	}
	if len(s.commands) > 0 {
		arr := make([]json.RawMessage, 0, len(s.commands))
		for _, c := range s.commands {
			b, _ := protojson.Marshal(c)
			arr = append(arr, b)
		}
		ps.Commands, _ = json.Marshal(arr)
	}
	return ps
}

func restoreSession(ps *persistedSession) *session {
	s := &session{
		id: ps.ID, kind: devboxv1.SessionKind(ps.Kind), parent: ps.Parent, agent: devboxv1.AgentType(ps.Agent), cwd: ps.Cwd,
		title: ps.Title, parentToolCall: ps.ParentTool, store: acp.NewStore(ps.ID, ps.NextPosition), rev: ps.Revision, createdAt: ps.CreatedAt,
		lastActivity: ps.LastActivity,
		foreground:   &devboxv1.ForegroundState{State: devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_IDLE, UpdatedAt: timestamppb.Now()},
	}
	for i, o := range ps.Options {
		syn := ""
		if i < len(ps.Synthetic) {
			syn = ps.Synthetic[i]
		}
		s.options = append(s.options, &cfgOption{raw: o, synthetic: syn})
	}
	if len(ps.Commands) > 0 {
		var arr []json.RawMessage
		if json.Unmarshal(ps.Commands, &arr) == nil {
			for _, raw := range arr {
				c := &devboxv1.AvailableCommand{}
				if protojson.Unmarshal(raw, c) == nil {
					s.commands = append(s.commands, c)
				}
			}
		}
	}
	return s
}

func (m *Manager) saveLocked() error {
	if m.opts.StateDir == "" {
		return nil
	}
	st := persistedState{AggRevision: m.aggRevision}
	for _, t := range m.threads {
		pt := persistedThread{
			ID: t.id, Agent: int32(t.agent), Cwd: t.cwd, Worktrees: t.worktrees, CreatedAt: t.createdAt, Title: t.title,
			Imported: t.imported, Closed: t.closed, Deleted: t.deleted, Model: t.model, Autonomy: int32(t.autonomy), Revision: t.rev,
		}
		if t.createdBy != nil {
			pt.CreatedBy, _ = protojson.Marshal(t.createdBy)
		}
		for _, id := range t.promptIDs {
			pt.PromptIDs = append(pt.PromptIDs, id)
			pt.Messages = append(pt.Messages, t.prompts[id])
		}
		for _, qp := range t.queue {
			pt.Queue = append(pt.Queue, persistPrompt(qp))
		}
		if t.session != nil {
			pt.Session = persistSession(t.session)
		}
		st.Threads = append(st.Threads, pt)
	}
	for _, s := range m.sessions {
		if s.kind == devboxv1.SessionKind_SESSION_KIND_SUBAGENT {
			st.Subagents = append(st.Subagents, *persistSession(s))
		}
	}
	for _, in := range m.interactions {
		if !in.reviewing && in.proto.GetState() == devboxv1.InteractionState_INTERACTION_STATE_PENDING {
			raw, _ := protojson.Marshal(in.proto)
			st.Interactions = append(st.Interactions, persistedInteraction{Proto: raw})
		}
	}
	return fsutil.WriteJSON(m.statePath(), st, 0o600)
}

// load restores threads after a daemon (re)start. Sessions are detached until re-resumed. Interactions that were
// pending when the daemon stopped can't be answered any more (the harness process is gone): they expire.
func (m *Manager) load() error {
	if m.opts.StateDir == "" {
		return nil
	}
	var st persistedState
	ok, err := fsutil.ReadJSON(m.statePath(), &st)
	if err != nil || !ok {
		return err
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	m.aggRevision = st.AggRevision
	for _, pt := range st.Threads {
		t := &thread{
			id: pt.ID, agent: devboxv1.AgentType(pt.Agent), cwd: pt.Cwd, worktrees: pt.Worktrees, createdAt: pt.CreatedAt,
			title: pt.Title, imported: pt.Imported, closed: pt.Closed, deleted: pt.Deleted, model: pt.Model,
			autonomy: devboxv1.Autonomy(pt.Autonomy), rev: pt.Revision,
		}
		if len(pt.CreatedBy) > 0 {
			p := &devboxv1.Principal{}
			if protojson.Unmarshal(pt.CreatedBy, p) == nil {
				t.createdBy = p
			}
		}
		for i, id := range pt.PromptIDs {
			msg := ""
			if i < len(pt.Messages) {
				msg = pt.Messages[i]
			}
			t.rememberPrompt(id, msg)
		}
		for _, pp := range pt.Queue {
			t.queue = append(t.queue, restorePrompt(pp))
		}
		if pt.Session != nil {
			s := restoreSession(pt.Session)
			s.thread = t
			t.session = s
			m.sessions[s.id] = s
		}
		m.threads[t.id] = t
	}
	for i := range st.Subagents {
		s := restoreSession(&st.Subagents[i])
		if parent := m.sessions[s.parent]; parent != nil {
			s.thread = parent.thread
		}
		m.sessions[s.id] = s
	}
	now := timestamppb.New(m.clock.Now())
	for _, pi := range st.Interactions {
		p := &devboxv1.Interaction{}
		if protojson.Unmarshal(pi.Proto, p) != nil {
			continue
		}
		p.State = devboxv1.InteractionState_INTERACTION_STATE_EXPIRED
		p.Revision++
		p.AnsweredAt = now
		m.emitLocked(&devboxv1.DaemonEvent{Event: &devboxv1.DaemonEvent_Interaction{Interaction: p}})
	}
	for _, t := range m.threads {
		t.dirty = true
	}
	m.dirty = true
	return nil
}
