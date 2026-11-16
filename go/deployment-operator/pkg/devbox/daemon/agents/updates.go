package agents

import (
	"encoding/json"
	"sort"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/acp"
)

// maxBufferedUpdates bounds session/update notifications held for a session the daemon doesn't know yet. Agents
// may send updates (commands, config) for a new session before its session/new response arrives.
const maxBufferedUpdates = 256

type bufferedUpdate struct {
	conn   *agentConn
	params json.RawMessage
}

// onSessionUpdate handles one session/update notification. Notifications are delivered in order per connection.
func (m *Manager) onSessionUpdate(c *agentConn, params json.RawMessage) {
	p, err := acp.DecodeObject(params)
	if err != nil {
		m.log.Warn("bad session/update", "err", err)
		return
	}
	sid := acp.Str(p, "sessionId")
	update := acp.Obj(p, "update")
	if sid == "" || update == nil {
		return
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, known := m.sessions[sid]; !known {
		if m.pending == nil {
			m.pending = map[string][]bufferedUpdate{}
		}
		if len(m.pending[sid]) < maxBufferedUpdates {
			m.pending[sid] = append(m.pending[sid], bufferedUpdate{conn: c, params: params})
		}
		return
	}
	m.applyUpdateLocked(c, sid, update)
}

// registerSessionLocked adds a session and applies updates that arrived before it was known.
func (m *Manager) registerSessionLocked(s *session) {
	m.sessions[s.id] = s
	buf := m.pending[s.id]
	delete(m.pending, s.id)
	for _, b := range buf {
		p, err := acp.DecodeObject(b.params)
		if err != nil {
			continue
		}
		m.applyUpdateLocked(b.conn, s.id, acp.Obj(p, "update"))
	}
}

func (m *Manager) applyUpdateLocked(c *agentConn, sid string, update acp.Object) {
	if c.norm == nil {
		return
	}
	now := m.clock.Now()
	for _, ch := range c.norm.Normalize(sid, update) {
		s := m.sessions[ch.SessionID]
		if s == nil && ch.Subagent != nil {
			s = m.subagentLocked(c, ch.Subagent)
		}
		if s == nil {
			s = m.sessions[sid]
		}
		if s == nil {
			continue
		}
		if ch.SubagentAnnouncement != nil {
			child := m.subagentLocked(c, ch.SubagentAnnouncement)
			if child != nil && ch.SubagentAnnouncement.Title != "" {
				child.title = ch.SubagentAnnouncement.Title
				child.dirty = true
			}
		}
		s.lastActivity = now
		switch ch.Kind {
		case acp.ChangeAppend, acp.ChangePatch:
			if s.replaying {
				continue
			}
			if m.applyEntityLocked(s, ch) {
				m.markDirtyLocked(s)
			}
		case acp.ChangeState:
			m.markDirtyLocked(s)
			m.applyStateLocked(s, ch)
		case acp.ChangeNotice:
			m.emitDeltaLocked(&devboxv1.Delta{SessionId: s.id, Op: devboxv1.DeltaOp_DELTA_OP_NOTICE, PayloadJson: acp.MustJSON(ch.Payload)})
		}
	}
}

// subagentLocked returns (creating if needed) the child session described by a lineage record. It never invents
// a parent: a lineage pointing at an unknown parent is dropped and the update stays on the session it came on.
func (m *Manager) subagentLocked(c *agentConn, l *acp.Lineage) *session {
	if l.ChildSessionID == "" {
		return nil
	}
	if s := m.sessions[l.ChildSessionID]; s != nil {
		return s
	}
	parent := m.sessions[l.ParentSessionID]
	if parent == nil {
		return nil
	}
	now := m.clock.Now()
	s := &session{
		id: l.ChildSessionID, kind: devboxv1.SessionKind_SESSION_KIND_SUBAGENT, parent: parent.id, agent: parent.agent,
		thread: parent.thread, cwd: parent.cwd, title: l.Title, store: acp.NewStore(l.ChildSessionID, 0),
		foreground: &devboxv1.ForegroundState{State: devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_RUNNING, UpdatedAt: timestamppb.New(now)},
		createdAt:  now, lastActivity: now, attached: parent.attached, dirty: true,
	}
	meta := acp.Object{}
	if l.ParentToolCallID != "" {
		meta["parentToolCallId"] = l.ParentToolCallID
	}
	if len(l.Meta) > 0 {
		meta["lineage"] = l.Meta
	}
	if len(meta) > 0 {
		s.meta = acp.Object{"devbox": meta}
	}
	m.registerSessionLocked(s)
	m.dirty = true
	return s
}

// markDirtyLocked queues a session's index row (and its thread's) for the next flush.
func (m *Manager) markDirtyLocked(s *session) {
	s.dirty = true
	if s.thread != nil && s.thread.session == s {
		s.thread.dirty = true
	}
}

// applyEntityLocked applies a chunk or patch and reports whether it started a new entity (which changes the
// session's entity count).
func (m *Manager) applyEntityLocked(s *session, ch acp.Change) bool {
	now := m.clock.Now()
	e, created := s.store.Apply(ch, now)
	op := devboxv1.DeltaOp_DELTA_OP_PATCH
	if ch.Kind == acp.ChangeAppend {
		op = devboxv1.DeltaOp_DELTA_OP_APPEND
	}
	m.emitDeltaLocked(&devboxv1.Delta{
		SessionId: s.id, EntityType: e.Type, EntityId: e.ID, Position: e.Position, Op: op, PayloadJson: acp.MustJSON(ch.Payload),
	})
	if ch.Complete {
		m.settleLocked(s, e)
	}
	return created
}

// settleLocked settles one entity: its revision goes to the transcript on the next flush and live viewers get
// SETTLE.
func (m *Manager) settleLocked(s *session, e *acp.Entity) {
	ae := s.store.Settle(e, m.clock.Now())
	m.unwritten[entityRef{session: e.SessionID, typ: e.Type, id: e.ID}] = ae
	m.emitDeltaLocked(&devboxv1.Delta{
		SessionId: s.id, EntityType: e.Type, EntityId: e.ID, Position: e.Position, Op: devboxv1.DeltaOp_DELTA_OP_SETTLE, Entity: ae,
	})
}

// settleSessionLocked settles every in-flight entity of a session and its subagents (turn end, requires_action,
// suspend).
func (m *Manager) settleSessionLocked(s *session) {
	for _, e := range s.store.Unsettled() {
		m.settleLocked(s, e)
	}
	for _, child := range m.childrenLocked(s.id) {
		m.settleSessionLocked(child)
	}
}

func (m *Manager) childrenLocked(id string) []*session {
	var out []*session
	for _, s := range m.sessions {
		if s.parent == id {
			out = append(out, s)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].id < out[j].id })
	return out
}

func (m *Manager) settleQuiet() {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := m.clock.Now()
	for _, s := range m.sessions {
		for _, e := range s.store.Quiet(now) {
			m.settleLocked(s, e)
		}
	}
}

// SettleAll settles every in-flight entity (PrepareSuspend).
func (m *Manager) SettleAll() {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, s := range m.sessions {
		for _, e := range s.store.Unsettled() {
			m.settleLocked(s, e)
		}
	}
	m.flushLocked()
}

func (m *Manager) applyStateLocked(s *session, ch acp.Change) {
	p := ch.Payload
	now := m.clock.Now()
	switch ch.StateKind {
	case acp.StateUpdate:
		m.setForegroundLocked(s, foregroundOf(p, now))
		return
	case acp.StateConfigOptionUpdate:
		s.options = mergeConfigOptions(s.options, acp.Arr(p, "configOptions"))
		m.syncAutonomyLocked(s)
	case acp.StateCommandsUpdate:
		s.commands = nil
		for _, c := range acp.Arr(p, "availableCommands") {
			if o, ok := c.(map[string]any); ok {
				s.commands = append(s.commands, acp.CommandOf(o))
			}
		}
	case acp.StateSessionInfoUpdate:
		if acp.Has(p, "title") {
			s.title = acp.Str(p, "title")
		}
		if meta := acp.Obj(p, "_meta"); meta != nil {
			if s.meta == nil {
				s.meta = acp.Object{}
			}
			s.meta["agent"] = meta
		}
	case acp.StateUsageUpdate:
		s.usage = usageOf(p)
		if s.thread != nil {
			if c := m.conns[s.agent]; c != nil {
				s.usage.Billing = c.spec.Billing
			}
		}
	case acp.StateCurrentModeUpdate:
		mode := acp.Str(p, "currentModeId")
		s.modeUpdates++
		for _, o := range s.options {
			if o.synthetic == modeCategory {
				o.raw["currentValue"] = mode
			}
		}
		m.syncAutonomyLocked(s)
	}
	m.emitDeltaLocked(&devboxv1.Delta{SessionId: s.id, Op: devboxv1.DeltaOp_DELTA_OP_STATE, StateKind: ch.StateKind, PayloadJson: acp.MustJSON(p)})
}

// setForegroundLocked records a session's foreground state and emits a v2 state_update delta. Entering
// requires_action or idle settles everything in flight (section 4.6a item 4).
func (m *Manager) setForegroundLocked(s *session, fg *devboxv1.ForegroundState) {
	s.foreground = fg
	m.markDirtyLocked(s)
	payload := acp.Object{"sessionUpdate": acp.StateUpdate, "state": foregroundName(fg.GetState())}
	if fg.GetStopReason() != "" {
		payload["stopReason"] = fg.GetStopReason()
	}
	if fg.GetError() != nil {
		payload["error"] = acp.Object{"code": fg.GetError().GetCode(), "message": fg.GetError().GetMessage(), "reason": fg.GetError().GetDetail().GetReason().String()}
	}
	m.emitDeltaLocked(&devboxv1.Delta{SessionId: s.id, Op: devboxv1.DeltaOp_DELTA_OP_STATE, StateKind: acp.StateUpdate, PayloadJson: acp.MustJSON(payload)})
	if fg.GetState() != devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_RUNNING {
		m.settleSessionLocked(s)
	}
}

func foregroundName(k devboxv1.ForegroundStateKind) string {
	switch k {
	case devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_RUNNING:
		return stateRunning
	case devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_REQUIRES_ACTION:
		return "requires_action"
	default:
		return "idle"
	}
}

// foregroundOf reads a v2 state_update.
func foregroundOf(p acp.Object, now time.Time) *devboxv1.ForegroundState {
	fg := &devboxv1.ForegroundState{UpdatedAt: timestamppb.New(now), StopReason: acp.Str(p, "stopReason"), Meta: acp.MetaStruct(p)}
	switch acp.Str(p, "state") {
	case stateRunning:
		fg.State = devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_RUNNING
	case "requires_action":
		fg.State = devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_REQUIRES_ACTION
	default:
		fg.State = devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_IDLE
	}
	if acp.Has(p, "backgroundWork") {
		fg.BackgroundWork = acp.ValueOf(p["backgroundWork"], true)
	}
	if e := acp.Obj(p, "error"); e != nil {
		code, _ := acp.Int(e, "code")
		fg.Error = &devboxv1.AgentError{Code: int32(code), Message: acp.Str(e, "message")}
		if acp.Has(e, "data") {
			fg.Error.Data = acp.ValueOf(e["data"], true)
		}
	}
	return fg
}

func usageOf(p acp.Object) *devboxv1.Usage {
	u := &devboxv1.Usage{Meta: acp.MetaStruct(p)}
	if v, ok := acp.Int(p, "used"); ok {
		u.Used = v
	}
	if v, ok := acp.Int(p, "size"); ok {
		u.Size = v
	}
	if c := acp.Obj(p, "cost"); c != nil {
		amt, _ := acp.Float(c, "amount")
		u.Cost = &devboxv1.Cost{Amount: amt, Currency: acp.Str(c, "currency")}
	}
	return u
}

// mergeConfigOptions replaces the agent-reported options and keeps synthetic (v1 models/modes) options the agent
// doesn't report itself.
func mergeConfigOptions(cur []*cfgOption, reported []any) []*cfgOption {
	var out []*cfgOption
	seen := map[string]bool{}
	for _, r := range reported {
		o, ok := r.(map[string]any)
		if !ok {
			continue
		}
		out = append(out, &cfgOption{raw: o})
		seen[acp.Str(o, "id")] = true
		seen["category:"+acp.Str(o, "category")] = true
	}
	for _, o := range cur {
		if o.synthetic != "" && !seen[o.id()] && !seen["category:"+o.category()] {
			out = append(out, o)
		}
	}
	return out
}
