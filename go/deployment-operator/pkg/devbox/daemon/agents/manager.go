// Package agents is the daemon's ACP session service (DBX-41, DBX-48): one ACP connection per agent type, shared
// by that agent's threads; threads mapped onto ACP's session built-ins; the prompt lifecycle with the
// per-instance running-thread limit; permission and elicitation interactions; config options (models included);
// slash commands; subagent lineage; and the live entity store whose normalized, v2-shaped changes are appended
// to the daemon's event log, with settled entities written to the box's transcript.
package agents

import (
	"context"
	"log/slog"
	"path/filepath"
	"sort"
	"sync"
	"time"

	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/timestamppb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/acp"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/harness"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/internal/clock"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/proc"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/transcript"
)

// DefaultMaxRunningThreads is the per-instance running-thread limit (section 4.6b).
const DefaultMaxRunningThreads = 4

// Version is the daemon version sent as ACP clientInfo.
var Version = "dev"

// PendingInteractionBusy is how long a pending interaction keeps the box awake (section 4.3a).
const PendingInteractionBusy = 15 * time.Minute

// activityInterval is how stale a session row's last activity may get before activity alone re-emits it.
const activityInterval = 10 * time.Second

// compactionInterval is how often the transcript folds its segments into snapshots.
const compactionInterval = 5 * time.Minute

// Emitter appends events to the daemon's event log.
type Emitter interface {
	Emit(ev *devboxv1.DaemonEvent)
}

// EmitterFunc adapts a function to Emitter.
type EmitterFunc func(ev *devboxv1.DaemonEvent)

// Emit implements Emitter.
func (f EmitterFunc) Emit(ev *devboxv1.DaemonEvent) { f(ev) }

// Launcher builds an agent's launch spec.
type Launcher interface {
	Spec(launch *devboxv1.AgentLaunch, endpoints *devboxv1.HarnessEndpoints, bootModel string) (*harness.Spec, error)
}

// WorktreeFunc creates per-thread worktrees and returns the session cwd.
type WorktreeFunc func(threadID string, repos []string) (string, error)

// Options configure a Manager.
type Options struct {
	Home     string
	StateDir string
	Emitter  Emitter
	// Head is the event log's latest offset, which timeline pages report as their delta offset.
	Head func() uint64
	// Transcript stores settled entities; in memory when nil.
	Transcript *transcript.Store
	Launcher   Launcher
	// Supervisor runs the harness processes.
	Supervisor *proc.Supervisor
	Clock      clock.Clock
	Log        *slog.Logger
	MaxRunning int
	// Endpoints returns the harness endpoints from Initialize.
	Endpoints func() *devboxv1.HarnessEndpoints
	// Worktrees creates thread worktrees (workspace package).
	Worktrees WorktreeFunc
	// Checkouts lists the workspace's checkouts for the instance aggregate.
	Checkouts func() []*devboxv1.Checkout
	// ExtraMCPServers are added to every session (e.g. the Playwright MCP driving the sandbox browser).
	ExtraMCPServers func() []any
	// OnAgentProcess is told about every harness process start and stop (credential managers hook in here).
	OnAgentProcess func(agent devboxv1.AgentType, started bool)
}

// Manager owns every agent connection, thread and subagent session in the instance.
type Manager struct {
	opts  Options
	log   *slog.Logger
	clock clock.Clock

	ctx    context.Context
	cancel context.CancelFunc

	mu           sync.Mutex
	instanceID   string
	defaultAgent devboxv1.AgentType
	defaultModel string
	defaultOpts  []*devboxv1.ConfigOptionSetting
	launches     map[devboxv1.AgentType]*devboxv1.AgentLaunch
	conns        map[devboxv1.AgentType]*agentConn
	starting     map[devboxv1.AgentType]chan struct{}
	threads      map[string]*thread
	sessions     map[string]*session
	interactions map[string]*interaction
	running      int
	waitQ        []*thread
	pending      map[string][]bufferedUpdate
	aggRevision  uint64
	lastAgg      string
	dirty        bool
	// unwritten are settled revisions not yet in the transcript; timelines merge them in until the next flush.
	unwritten map[entityRef]*devboxv1.AcpEntity

	termMu sync.Mutex
	terms  map[string]*clientTerminal
}

// New returns a Manager. Call Start to load persisted threads and run background work.
func New(opts Options) *Manager {
	if opts.Clock == nil {
		opts.Clock = clock.Real{}
	}
	if opts.Log == nil {
		opts.Log = slog.Default()
	}
	if opts.MaxRunning <= 0 {
		opts.MaxRunning = DefaultMaxRunningThreads
	}
	if opts.Endpoints == nil {
		opts.Endpoints = func() *devboxv1.HarnessEndpoints { return &devboxv1.HarnessEndpoints{} }
	}
	if opts.Supervisor == nil {
		opts.Supervisor = proc.NewSupervisor(opts.Log)
	}
	if opts.Transcript == nil {
		opts.Transcript = transcript.Memory()
	}
	if opts.Head == nil {
		opts.Head = func() uint64 { return 0 }
	}
	ctx, cancel := context.WithCancel(context.Background())
	return &Manager{
		opts: opts, log: opts.Log.With("component", "agents"), clock: opts.Clock, ctx: ctx, cancel: cancel,
		launches: map[devboxv1.AgentType]*devboxv1.AgentLaunch{}, conns: map[devboxv1.AgentType]*agentConn{},
		starting: map[devboxv1.AgentType]chan struct{}{}, threads: map[string]*thread{}, sessions: map[string]*session{},
		interactions: map[string]*interaction{}, unwritten: map[entityRef]*devboxv1.AcpEntity{},
	}
}

// entityRef identifies an entity across the instance's sessions.
type entityRef struct {
	session string
	typ     devboxv1.EntityType
	id      string
}

// Configure applies the instance configuration from Initialize.
func (m *Manager) Configure(instanceID string, agent devboxv1.AgentType, model string, options []*devboxv1.ConfigOptionSetting, launches []*devboxv1.AgentLaunch, maxRunning int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.instanceID = instanceID
	m.defaultAgent, m.defaultModel, m.defaultOpts = agent, model, options
	for _, l := range launches {
		m.launches[l.GetAgent()] = l
	}
	if maxRunning > 0 {
		m.opts.MaxRunning = maxRunning
	}
	m.dirty = true
}

// Start loads persisted threads, re-resumes open threads in the background and runs the settle sweeper and
// index flusher.
func (m *Manager) Start() error {
	if err := m.load(); err != nil {
		return err
	}
	go m.background()
	return nil
}

// Stop stops every agent connection.
func (m *Manager) Stop(ctx context.Context) {
	m.cancel()
	m.mu.Lock()
	conns := make([]*agentConn, 0, len(m.conns))
	for _, c := range m.conns {
		conns = append(conns, c)
	}
	m.mu.Unlock()
	for _, c := range conns {
		c.stop(2 * time.Second)
	}
	m.Flush()
}

func (m *Manager) background() {
	settle := m.clock.NewTicker(time.Second)
	flush := m.clock.NewTicker(300 * time.Millisecond)
	compact := m.clock.NewTicker(compactionInterval)
	defer settle.Stop()
	defer flush.Stop()
	defer compact.Stop()
	for {
		select {
		case <-m.ctx.Done():
			return
		case <-settle.C():
			m.settleQuiet()
		case <-flush.C():
			m.Flush()
		case <-compact.C():
			if err := m.opts.Transcript.CompactAll(m.ctx, false); err != nil && m.ctx.Err() == nil {
				m.log.Error("transcript compaction", "err", err)
			}
		}
	}
}

// emitLocked appends an event to the log. Called with m.mu held so log order matches state order.
func (m *Manager) emitLocked(ev *devboxv1.DaemonEvent) {
	if m.opts.Emitter != nil {
		// Records are snapshots; the live objects keep changing.
		m.opts.Emitter.Emit(proto.Clone(ev).(*devboxv1.DaemonEvent))
	}
}

func (m *Manager) emitDeltaLocked(d *devboxv1.Delta) {
	d.InstanceId = m.instanceID
	m.emitLocked(&devboxv1.DaemonEvent{Event: &devboxv1.DaemonEvent_Delta{Delta: d}})
}

func (m *Manager) emitConditionLocked(typ, severity, msg string, active bool) {
	m.emitLocked(&devboxv1.DaemonEvent{Event: &devboxv1.DaemonEvent_Condition{Condition: &devboxv1.DaemonCondition{
		Type: typ, Severity: severity, Message: msg, Active: active,
	}}})
}

// Flush writes settled entities to the transcript, emits dirty session rows and the instance aggregate, and
// persists thread state.
func (m *Manager) Flush() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.flushLocked()
}

func (m *Manager) flushLocked() {
	now := m.clock.Now()
	m.writeTranscriptLocked()
	for _, t := range m.threads {
		if t.dirty || activityDue(t.session) {
			t.dirty = false
			t.rev++
			m.emitLocked(&devboxv1.DaemonEvent{Event: &devboxv1.DaemonEvent_Session{Session: m.threadRowLocked(t)}})
			reported(t.session)
		}
	}
	for _, s := range m.sessions {
		if s.kind == devboxv1.SessionKind_SESSION_KIND_SUBAGENT && (s.dirty || activityDue(s)) {
			s.dirty = false
			s.rev++
			m.emitLocked(&devboxv1.DaemonEvent{Event: &devboxv1.DaemonEvent_Session{Session: m.subagentRowLocked(s)}})
			reported(s)
		}
	}
	for id, in := range m.interactions {
		if in.proto.GetState() != devboxv1.InteractionState_INTERACTION_STATE_PENDING && now.Sub(in.proto.GetAnsweredAt().AsTime()) > 10*time.Minute {
			delete(m.interactions, id)
		}
	}
	agg := m.aggregateLocked()
	key := acp.MustJSON(map[string]any{"f": agg.Foreground, "r": agg.RunningThreads, "w": agg.WaitingThreads, "c": connKey(agg.Connections), "k": checkoutKey(agg.Checkouts)})
	if string(key) != m.lastAgg {
		m.lastAgg = string(key)
		m.aggRevision++
		agg.Revision = m.aggRevision
		m.emitLocked(&devboxv1.DaemonEvent{Event: &devboxv1.DaemonEvent_Aggregate{Aggregate: agg}})
	}
	if m.dirty {
		m.dirty = false
		if err := m.saveLocked(); err != nil {
			m.log.Error("persist threads", "err", err)
		}
	}
}

// activityDue is whether a session's only change, its last activity, has drifted far enough from the last emitted
// row to be worth re-emitting.
func activityDue(s *session) bool {
	return s != nil && s.lastActivity.Sub(s.reportedActivity) >= activityInterval
}

func reported(s *session) {
	if s != nil {
		s.reportedActivity = s.lastActivity
	}
}

func connKey(cs []*devboxv1.AgentConnection) []string {
	out := make([]string, 0, len(cs))
	for _, c := range cs {
		out = append(out, c.GetAgent().String()+":"+c.GetState()+":"+c.GetBilling().String())
	}
	return out
}

func checkoutKey(cs []*devboxv1.Checkout) []string {
	out := make([]string, 0, len(cs))
	for _, c := range cs {
		out = append(out, c.GetPath()+"@"+c.GetHeadSha()+c.GetBranch())
	}
	return out
}

func (m *Manager) aggregateLocked() *devboxv1.InstanceAggregate {
	agg := &devboxv1.InstanceAggregate{
		Foreground:     devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_IDLE,
		RunningThreads: int32(m.running),
		WaitingThreads: int32(len(m.waitQ)),
		Connections:    m.connectionsLocked(),
	}
	for _, t := range m.threads {
		if t.session == nil || !t.open() {
			continue
		}
		switch t.session.foreground.GetState() {
		case devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_REQUIRES_ACTION:
			agg.Foreground = devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_REQUIRES_ACTION
		case devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_RUNNING:
			if agg.Foreground != devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_REQUIRES_ACTION {
				agg.Foreground = devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_RUNNING
			}
		}
	}
	if m.opts.Checkouts != nil {
		agg.Checkouts = m.opts.Checkouts()
	}
	return agg
}

// Connections returns the live agent connections.
func (m *Manager) Connections() []*devboxv1.AgentConnection {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.connectionsLocked()
}

func (m *Manager) connectionsLocked() []*devboxv1.AgentConnection {
	out := make([]*devboxv1.AgentConnection, 0, len(m.conns))
	for _, c := range m.conns {
		out = append(out, c.info())
	}
	sort.Slice(out, func(i, j int) bool { return out[i].GetAgent() < out[j].GetAgent() })
	return out
}

func (m *Manager) threadRowLocked(t *thread) *devboxv1.Session {
	row := &devboxv1.Session{
		ThreadId:      t.id,
		Kind:          devboxv1.SessionKind_SESSION_KIND_THREAD,
		Agent:         t.agent,
		Cwd:           t.cwd,
		WorktreeRepos: t.worktrees,
		Status:        t.status(),
		CreatedBy:     t.createdBy,
		CreatedAt:     timestamppb.New(t.createdAt),
		Imported:      t.imported,
		Revision:      t.rev,
		Title:         t.title,
	}
	if s := t.session; s != nil {
		fillSessionRow(row, s)
	}
	return row
}

func (m *Manager) subagentRowLocked(s *session) *devboxv1.Session {
	row := &devboxv1.Session{
		Kind:            devboxv1.SessionKind_SESSION_KIND_SUBAGENT,
		ParentSessionId: s.parent,
		Agent:           s.agent,
		Cwd:             s.cwd,
		Status:          devboxv1.ThreadStatus_THREAD_STATUS_ACTIVE,
		CreatedAt:       timestamppb.New(s.createdAt),
		Revision:        s.rev,
	}
	fillSessionRow(row, s)
	return row
}

func fillSessionRow(row *devboxv1.Session, s *session) {
	row.SessionId = s.id
	if s.title != "" {
		row.Title = s.title
	}
	row.LastActivityAt = timestamppb.New(s.lastActivity)
	row.EntityCount = s.store.Count()
	row.Foreground = s.foreground
	row.ConfigOptions = s.configProtos()
	row.AvailableCommands = s.commands
	row.Usage = s.usage
	row.Meta = acp.StructOf(s.meta)
}

// BusyReasons reports agent activity for idle detection: running turns and fresh pending interactions.
func (m *Manager) BusyReasons(now time.Time) []*devboxv1.BusyReason {
	m.mu.Lock()
	defer m.mu.Unlock()
	var out []*devboxv1.BusyReason
	for _, t := range m.threads {
		if t.running || t.waiting || len(t.queue) > 0 {
			out = append(out, &devboxv1.BusyReason{Kind: devboxv1.BusyReasonKind_BUSY_REASON_KIND_AGENT_TURN, Detail: t.displayTitle(), ThreadId: t.id})
		}
	}
	for _, in := range m.interactions {
		if in.proto.GetState() != devboxv1.InteractionState_INTERACTION_STATE_PENDING {
			continue
		}
		created := in.proto.GetCreatedAt().AsTime()
		if now.Sub(created) < PendingInteractionBusy {
			out = append(out, &devboxv1.BusyReason{
				Kind: devboxv1.BusyReasonKind_BUSY_REASON_KIND_PENDING_INTERACTION, Detail: in.proto.GetTitle(),
				ThreadId: in.proto.GetThreadId(), Until: timestamppb.New(created.Add(PendingInteractionBusy)),
			})
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].GetThreadId() < out[j].GetThreadId() })
	return out
}

func (m *Manager) statePath() string { return filepath.Join(m.opts.StateDir, "threads.json") }
