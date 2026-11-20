package agents

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"slices"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/protobuf/types/known/timestamppb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/acp"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/derr"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/harness"
)

// listPagesMax bounds session/list pagination.
const listPagesMax = 20

// modelCategory is the ACP session config option category (and synthetic option id) for model selection.
const modelCategory = "model"

// modeCategory is the ACP session config option category (and synthetic option id) for session modes.
const modeCategory = "mode"

// ToStatus converts agent failures to gRPC errors with typed reasons; other errors pass through.
func ToStatus(err error) error {
	if err == nil {
		return nil
	}
	var ae *AgentCallError
	if errors.As(err, &ae) {
		reason := ae.Err.GetDetail().GetReason()
		code := codes.Unavailable
		switch reason {
		case devboxv1.ErrorReason_ERROR_REASON_AGENT_AUTH_FAILED:
			code = codes.Unauthenticated
		case devboxv1.ErrorReason_ERROR_REASON_PLAN_LIMIT_REACHED:
			code = codes.ResourceExhausted
		}
		return derr.New(code, reason, ae.Error(), map[string]string{"op": ae.Op})
	}
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return derr.New(codes.DeadlineExceeded, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, err.Error(), nil)
	}
	return err
}

func (m *Manager) resolveCwd(cwd string) string {
	switch {
	case cwd == "" || cwd == "~":
		return m.opts.Home
	case strings.HasPrefix(cwd, "~/"):
		return filepath.Join(m.opts.Home, cwd[2:])
	case filepath.IsAbs(cwd):
		return filepath.Clean(cwd)
	default:
		return filepath.Join(m.opts.Home, cwd)
	}
}

func (m *Manager) threadLocked(ref *devboxv1.ThreadRef) (*thread, error) {
	if ref.GetThreadId() != "" {
		if t, ok := m.threads[ref.GetThreadId()]; ok && !t.deleted {
			return t, nil
		}
		return nil, derr.ThreadNotFound(ref.GetThreadId())
	}
	if s, ok := m.sessions[ref.GetSessionId()]; ok && s.thread != nil && !s.thread.deleted {
		return s.thread, nil
	}
	return nil, derr.ThreadNotFound(ref.GetSessionId())
}

// mcpServers builds a session's MCP servers: the workbench's tools, the gateway's devbox MCP with the thread's
// `X-Devbox-Thread` header, and daemon-local servers (Playwright).
func (m *Manager) mcpServers(c *agentConn, threadID string) []any {
	ep := m.opts.Endpoints()
	out := []any{}
	// atenet-egress only replaces headers that are present, so each entry carries an Authorization placeholder.
	auth := map[string]any{"name": "Authorization", "value": "Bearer " + harness.PlaceholderKey}
	if c.caps.mcpHTTP {
		if u := ep.GetWorkbenchMcpUrl(); u != "" {
			out = append(out, map[string]any{"type": "http", "name": "plural-workbench", "url": u, "headers": []any{auth}})
		}
		if u := ep.GetDevboxMcpUrl(); u != "" {
			out = append(out, map[string]any{"type": "http", "name": "devbox", "url": u, "headers": []any{
				auth, map[string]any{"name": devboxv1.ThreadHeader, "value": threadID},
			}})
		}
	} else if ep.GetWorkbenchMcpUrl() != "" || ep.GetDevboxMcpUrl() != "" {
		m.log.Warn("agent does not support HTTP MCP servers; workbench and devbox MCP are unavailable", "agent", harness.AgentName(c.agent))
	}
	if m.opts.ExtraMCPServers != nil {
		out = append(out, m.opts.ExtraMCPServers()...)
	}
	return out
}

// sessionResult applies a session/new|load|resume|fork result: config options (with v1 models/modes folded in as
// synthetic options).
func sessionResult(s *session, res acp.Object) {
	if opts := acp.Arr(res, "configOptions"); opts != nil {
		s.options = mergeConfigOptions(s.options, opts)
	}
	has := func(cat string) bool {
		for _, o := range s.options {
			if o.category() == cat {
				return true
			}
		}
		return false
	}
	if models := acp.Obj(res, "models"); models != nil && !has("model") {
		var values []any
		for _, mv := range acp.Arr(models, "availableModels") {
			if mo, ok := mv.(map[string]any); ok {
				v := map[string]any{"value": acp.Str(mo, "modelId"), "name": acp.Str(mo, "name")}
				if d := acp.Str(mo, "description"); d != "" {
					v["description"] = d
				}
				if meta := acp.Obj(mo, "_meta"); meta != nil {
					v["_meta"] = meta
				}
				values = append(values, v)
			}
		}
		s.options = append(s.options, &cfgOption{synthetic: "model", raw: acp.Object{
			"id": "model", "name": "Model", "category": "model", "type": "select",
			"currentValue": acp.Str(models, "currentModelId"), "options": values,
		}})
	}
	if modes := acp.Obj(res, "modes"); modes != nil && !has(modeCategory) {
		var values []any
		for _, mv := range acp.Arr(modes, "availableModes") {
			if mo, ok := mv.(map[string]any); ok {
				v := map[string]any{"value": acp.Str(mo, "id"), "name": acp.Str(mo, "name")}
				if d := acp.Str(mo, "description"); d != "" {
					v["description"] = d
				}
				values = append(values, v)
			}
		}
		s.options = append(s.options, &cfgOption{synthetic: modeCategory, raw: acp.Object{
			"id": modeCategory, "name": "Mode", "category": modeCategory, "type": "select",
			"currentValue": acp.Str(modes, "currentModeId"), "options": values,
		}})
	}
}

func (m *Manager) newSessionLocked(t *thread, id string) *session {
	now := m.clock.Now()
	s := &session{
		id: id, kind: devboxv1.SessionKind_SESSION_KIND_THREAD, agent: t.agent, thread: t, cwd: t.cwd,
		store:      acp.NewStore(id, 0),
		foreground: &devboxv1.ForegroundState{State: devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_IDLE, UpdatedAt: timestamppb.New(now)},
		createdAt:  now, lastActivity: now, attached: true, dirty: true,
	}
	t.session = s
	m.registerSessionLocked(s)
	return s
}

// CreateThread starts a thread: `session/new` with the thread's cwd and MCP servers, then the requested model and
// config options. Idempotent on thread_id.
func (m *Manager) CreateThread(ctx context.Context, req *devboxv1.CreateThreadRequest) (*devboxv1.Session, error) {
	id := req.GetThreadId()
	if id == "" {
		id = uuid.NewString()
	}
	m.mu.Lock()
	if t, ok := m.threads[id]; ok && !t.deleted && t.session != nil {
		row := m.threadRowLocked(t)
		m.mu.Unlock()
		return row, nil
	}
	agent := req.GetAgent()
	if agent == devboxv1.AgentType_AGENT_TYPE_UNSPECIFIED {
		agent = m.defaultAgent
	}
	if agent == devboxv1.AgentType_AGENT_TYPE_UNSPECIFIED {
		agent = devboxv1.AgentType_AGENT_TYPE_CLAUDE
	}
	model := req.GetModel()
	settings := req.GetConfigOptions()
	if agent == m.defaultAgent {
		if model == "" {
			model = m.defaultModel
		}
		if len(settings) == 0 {
			settings = m.defaultOpts
		}
	}
	if err := m.checkAutonomyLocked(agent); err != nil {
		m.mu.Unlock()
		return nil, err
	}
	autonomy := m.autonomyDefaultLocked()
	var rest []*devboxv1.ConfigOptionSetting
	for _, st := range settings {
		if st.GetConfigId() == autonomyCategory {
			if lvl := autonomyOfValue(st.GetValue()); lvl != devboxv1.Autonomy_AUTONOMY_UNSPECIFIED {
				autonomy = lvl
			}
			continue
		}
		rest = append(rest, st)
	}
	settings = rest
	m.mu.Unlock()

	cwd := m.resolveCwd(req.GetCwd())
	if len(req.GetWorktreeRepos()) > 0 {
		if m.opts.Worktrees == nil {
			return nil, derr.Unsupported("worktrees")
		}
		wt, err := m.opts.Worktrees(id, req.GetWorktreeRepos())
		if err != nil {
			return nil, err
		}
		cwd = wt
	}
	c, err := m.connection(ctx, agent)
	if err != nil {
		return nil, ToStatus(err)
	}
	res, err := c.call(ctx, acp.MethodSessionNew, map[string]any{"cwd": cwd, "mcpServers": m.mcpServers(c, id)})
	if err != nil {
		return nil, ToStatus(agentFailure(err, "session/new"))
	}
	sid := acp.Str(res, "sessionId")
	if sid == "" {
		return nil, ToStatus(agentFailure(errors.New("agent returned no sessionId"), "session/new"))
	}

	m.mu.Lock()
	t := &thread{
		id: id, agent: agent, cwd: cwd, worktrees: req.GetWorktreeRepos(), createdBy: req.GetCreatedBy(),
		createdAt: m.clock.Now(), title: req.GetTitle(), model: model, dirty: true,
	}
	if old, ok := m.threads[id]; ok {
		t.prompts, t.promptIDs, t.rev = old.prompts, old.promptIDs, old.rev
	}
	m.threads[id] = t
	s := m.newSessionLocked(t, sid)
	sessionResult(s, res)
	m.dirty = true
	m.mu.Unlock()

	err = m.applyInitialConfig(ctx, c, t, model, settings)
	m.mu.Lock()
	autonomy = clampAutonomy(min(autonomy, m.autonomyMaxLocked()), m.supportedLevelsLocked(agent, s))
	m.mu.Unlock()
	err = errors.Join(err, m.applyAutonomy(ctx, c, t, autonomy))
	if err != nil {
		m.log.Warn("initial thread config failed", "thread", id, "err", err)
		m.mu.Lock()
		m.emitConditionLocked("thread_config_failed", "warning", fmt.Sprintf("thread %s: %v", id, err), true)
		m.mu.Unlock()
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	m.flushLocked()
	return m.threadRowLocked(t), nil
}

// applyInitialConfig sets the thread's model and config options after the session exists. The model goes through
// the model-category config option (or v1 set_model); never through harness config files.
func (m *Manager) applyInitialConfig(ctx context.Context, c *agentConn, t *thread, model string, settings []*devboxv1.ConfigOptionSetting) error {
	var errs []error
	if model != "" {
		m.mu.Lock()
		s := t.session
		var opt *cfgOption
		for _, o := range s.options {
			if o.category() == modelCategory {
				opt = o
				break
			}
		}
		m.mu.Unlock()
		switch {
		case opt != nil:
			if !slices.Contains(harness.ModelIDs(t.agent, model), acp.Str(opt.raw, "currentValue")) {
				if _, err := m.setConfig(ctx, c, s, opt.id(), model); err != nil {
					errs = append(errs, err)
				}
			}
		case c.spec.BootModel == model:
			// Set through boot flags/env for adapters without ACP model control.
		default:
			errs = append(errs, derr.InvalidAgentOrModel(fmt.Sprintf("%s has no ACP model control; model %q can't be selected per thread", harness.AgentName(t.agent), model)))
		}
	}
	for _, st := range settings {
		if _, err := m.setConfig(ctx, c, t.session, st.GetConfigId(), st.GetValue()); err != nil {
			errs = append(errs, err)
		}
	}
	return errors.Join(errs...)
}

// setConfig changes one config option and returns the agent's reported options.
func (m *Manager) setConfig(ctx context.Context, c *agentConn, s *session, configID, value string) ([]*devboxv1.ConfigOption, error) {
	if configID == autonomyCategory {
		lvl := autonomyOfValue(value)
		if lvl == devboxv1.Autonomy_AUTONOMY_UNSPECIFIED {
			return nil, derr.InvalidAgentOrModel(fmt.Sprintf("%q is not a valid value for autonomy", value))
		}
		if s.thread == nil {
			return nil, derr.InvalidAgentOrModel("autonomy is set per thread")
		}
		if err := m.applyAutonomy(ctx, c, s.thread, lvl); err != nil {
			return nil, err
		}
		m.mu.Lock()
		defer m.mu.Unlock()
		return s.configProtos(), nil
	}
	m.mu.Lock()
	var opt *cfgOption
	for _, o := range s.options {
		if o.id() == configID || (o.category() == configID && configID != "") {
			opt = o
			break
		}
	}
	if opt == nil {
		m.mu.Unlock()
		return nil, derr.InvalidAgentOrModel(fmt.Sprintf("unknown config option %q", configID))
	}
	if !optionAllows(opt.raw, value) {
		alt := ""
		if opt.category() == modelCategory {
			for _, id := range harness.ModelIDs(s.agent, value)[1:] {
				if optionAllows(opt.raw, id) {
					alt = id
					break
				}
			}
		}
		if alt == "" {
			m.mu.Unlock()
			return nil, derr.InvalidAgentOrModel(fmt.Sprintf("%q is not a valid value for %s", value, opt.id()))
		}
		value = alt
	}
	if opt.category() == modeCategory {
		if err := m.modeAllowedLocked(s.agent, s, value); err != nil {
			m.mu.Unlock()
			return nil, err
		}
	}
	synthetic, id, sid := opt.synthetic, opt.id(), s.id
	wasAuto := s.thread != nil && s.thread.autonomy == devboxv1.Autonomy_AUTONOMY_AUTO
	requestedMode := ""
	if opt.category() == modeCategory {
		requestedMode = value
	}
	modeUpdates := s.modeUpdates
	m.mu.Unlock()

	var res acp.Object
	var err error
	switch synthetic {
	case modelCategory:
		res, err = c.call(ctx, acp.MethodSetModel, map[string]any{"sessionId": sid, "modelId": value})
	case modeCategory:
		res, err = c.call(ctx, acp.MethodSetMode, map[string]any{"sessionId": sid, "modeId": value})
	default:
		res, err = c.call(ctx, acp.MethodSetConfigOption, map[string]any{"sessionId": sid, "configId": id, "value": value})
	}
	if err != nil {
		return nil, ToStatus(agentFailure(err, "set config option "+id))
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if opts := acp.Arr(res, "configOptions"); opts != nil {
		s.options = mergeConfigOptions(s.options, opts)
	} else if synthetic != "" && (synthetic != modeCategory || s.modeUpdates == modeUpdates) {
		// The ACP SDK delivers notifications sent before a response first, so a current_mode_update during
		// set_mode (Claude's Auto fallback) is the effective mode.
		opt.raw["currentValue"] = value
	}
	if opt.category() == modelCategory && s.thread != nil && s.thread.session == s {
		s.thread.model = value
	}
	noteAutoFallbackLocked(s, wasAuto, requestedMode)
	m.syncAutonomyLocked(s)
	m.emitConfigLocked(s)
	return s.configProtos(), nil
}

// emitConfigLocked marks a session's options changed and emits them as a config_option_update.
func (m *Manager) emitConfigLocked(s *session) {
	s.dirty = true
	if s.thread != nil {
		s.thread.dirty = true
	}
	m.dirty = true
	m.emitDeltaLocked(&devboxv1.Delta{SessionId: s.id, Op: devboxv1.DeltaOp_DELTA_OP_STATE, StateKind: acp.StateConfigOptionUpdate,
		PayloadJson: acp.MustJSON(acp.Object{"sessionUpdate": acp.StateConfigOptionUpdate, "configOptions": s.configJSON()})})
}

// optionAllows checks a value against a select option's values (grouped or flat). Non-select options accept any.
func optionAllows(o acp.Object, value string) bool {
	if acp.Str(o, "type") != "" && acp.Str(o, "type") != "select" {
		return true
	}
	opts := acp.Arr(o, "options")
	if len(opts) == 0 {
		return true
	}
	for _, v := range opts {
		vo, ok := v.(map[string]any)
		if !ok {
			continue
		}
		if acp.Str(vo, "value") == value {
			return true
		}
		for _, g := range acp.Arr(vo, "options") {
			if go_, ok := g.(map[string]any); ok && acp.Str(go_, "value") == value {
				return true
			}
		}
	}
	return false
}

// SetThreadConfigOption implements the RPC.
func (m *Manager) SetThreadConfigOption(ctx context.Context, ref *devboxv1.ThreadRef, setting *devboxv1.ConfigOptionSetting) ([]*devboxv1.ConfigOption, error) {
	m.mu.Lock()
	t, err := m.threadLocked(ref)
	if err != nil {
		m.mu.Unlock()
		return nil, err
	}
	agent := t.agent
	m.mu.Unlock()
	c, err := m.connection(ctx, agent)
	if err != nil {
		return nil, ToStatus(err)
	}
	if err := m.ensureAttached(ctx, c, t, false); err != nil {
		return nil, err
	}
	return m.setConfig(ctx, c, t.session, setting.GetConfigId(), setting.GetValue())
}

// ensureAttached reopens a thread's session on the agent's current process: `session/resume` when advertised
// (no replay needed), else `session/load` with the replay suppressed because the transcript already has it.
func (m *Manager) ensureAttached(ctx context.Context, c *agentConn, t *thread, replay bool) error {
	m.mu.Lock()
	s := t.session
	if s == nil {
		m.mu.Unlock()
		return derr.New(codes.FailedPrecondition, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, "thread has no agent session", nil)
	}
	if s.attached && m.conns[t.agent] == c {
		m.mu.Unlock()
		return nil
	}
	params := map[string]any{"sessionId": s.id, "cwd": s.cwd, "mcpServers": m.mcpServers(c, t.id)}
	var method string
	switch {
	case c.caps.resume:
		method = acp.MethodSessionResume
		if replay && c.caps.replay {
			params["replayFrom"] = "start"
		} else {
			s.replaying = true
		}
	case c.caps.load:
		method = acp.MethodSessionLoad
		s.replaying = !replay && s.store.Count() > 0
	default:
		m.mu.Unlock()
		return derr.Unsupported("resume")
	}
	m.mu.Unlock()
	res, err := c.call(ctx, method, params)
	m.mu.Lock()
	s.replaying = false
	if err != nil {
		m.mu.Unlock()
		return ToStatus(agentFailure(err, method))
	}
	s.attached = true
	for _, child := range m.childrenLocked(s.id) {
		child.attached = true
	}
	autonomy := t.autonomy
	// The agent's fresh mode isn't the thread's level until the level is reapplied below.
	t.autonomy = devboxv1.Autonomy_AUTONOMY_UNSPECIFIED
	sessionResult(s, res)
	s.dirty, t.dirty, m.dirty = true, true, true
	if autonomy == devboxv1.Autonomy_AUTONOMY_UNSPECIFIED {
		autonomy = m.autonomyDefaultLocked()
	}
	autonomy = clampAutonomy(min(autonomy, m.autonomyMaxLocked()), m.supportedLevelsLocked(t.agent, s))
	model := t.model
	var cur string
	for _, o := range s.options {
		if o.category() == modelCategory {
			cur = acp.Str(o.raw, "currentValue")
		}
	}
	m.mu.Unlock()
	if model != "" && cur != "" && cur != model {
		if _, err := m.setConfig(ctx, c, s, "model", model); err != nil {
			m.log.Warn("restore thread model", "thread", t.id, "err", err)
		}
	}
	if autonomy != devboxv1.Autonomy_AUTONOMY_UNSPECIFIED {
		if err := m.applyAutonomy(ctx, c, t, autonomy); err != nil {
			m.log.Warn("restore thread autonomy", "thread", t.id, "err", err)
		}
	}
	return nil
}

// Threads returns the index rows of every thread and subagent.
func (m *Manager) Threads() []*devboxv1.Session {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]*devboxv1.Session, 0, len(m.threads))
	for _, t := range m.threads {
		out = append(out, m.threadRowLocked(t))
	}
	sort.Slice(out, func(i, j int) bool { return out[i].GetCreatedAt().AsTime().Before(out[j].GetCreatedAt().AsTime()) })
	return out
}

// ListThreads implements the RPC; importable sessions come from session/list on each launched agent.
func (m *Manager) ListThreads(ctx context.Context, includeImportable bool) (*devboxv1.ListThreadsResponse, error) {
	resp := &devboxv1.ListThreadsResponse{}
	for _, row := range m.Threads() {
		if row.GetStatus() != devboxv1.ThreadStatus_THREAD_STATUS_DELETED {
			resp.Threads = append(resp.Threads, row)
		}
	}
	if !includeImportable {
		return resp, nil
	}
	m.mu.Lock()
	agents := map[devboxv1.AgentType]bool{}
	for t := range m.launches {
		agents[t] = true
	}
	for t := range m.conns {
		agents[t] = true
	}
	if m.defaultAgent != devboxv1.AgentType_AGENT_TYPE_UNSPECIFIED {
		agents[m.defaultAgent] = true
	}
	known := map[string]bool{}
	for id := range m.sessions {
		known[id] = true
	}
	m.mu.Unlock()
	for agent := range agents {
		c, err := m.connection(ctx, agent)
		if err != nil {
			m.log.Warn("list sessions: agent unavailable", "agent", harness.AgentName(agent), "err", err)
			continue
		}
		if !c.caps.list {
			continue
		}
		cursor := ""
		for page := 0; page < listPagesMax; page++ {
			params := map[string]any{}
			if cursor != "" {
				params["cursor"] = cursor
			}
			res, err := c.call(ctx, acp.MethodSessionList, params)
			if err != nil {
				m.log.Warn("session/list failed", "agent", harness.AgentName(agent), "err", err)
				break
			}
			for _, v := range acp.Arr(res, "sessions") {
				so, ok := v.(map[string]any)
				if !ok || known[acp.Str(so, "sessionId")] {
					continue
				}
				is := &devboxv1.ImportableSession{
					Agent: agent, SessionId: acp.Str(so, "sessionId"), Title: acp.Str(so, "title"), Cwd: acp.Str(so, "cwd"), Meta: acp.MetaStruct(so),
				}
				if ts, err := time.Parse(time.RFC3339, acp.Str(so, "updatedAt")); err == nil {
					is.UpdatedAt = timestamppb.New(ts)
				}
				resp.Importable = append(resp.Importable, is)
			}
			cursor = acp.Str(res, "nextCursor")
			if cursor == "" {
				break
			}
		}
	}
	return resp, nil
}

// ImportThread adopts a session the agent listed: `session/resume` with replay (or `session/load`), with the
// replayed history kept as the new thread's transcript.
func (m *Manager) ImportThread(ctx context.Context, req *devboxv1.ImportThreadRequest) (*devboxv1.Session, error) {
	id := req.GetThreadId()
	if id == "" {
		id = uuid.NewString()
	}
	agent := req.GetAgent()
	if agent == devboxv1.AgentType_AGENT_TYPE_UNSPECIFIED {
		m.mu.Lock()
		agent = m.defaultAgent
		m.mu.Unlock()
	}
	c, err := m.connection(ctx, agent)
	if err != nil {
		return nil, ToStatus(err)
	}
	if !c.caps.load && (!c.caps.resume || !c.caps.replay) {
		return nil, derr.Unsupported("import")
	}
	m.mu.Lock()
	if t, ok := m.threads[id]; ok && !t.deleted {
		row := m.threadRowLocked(t)
		m.mu.Unlock()
		return row, nil
	}
	if s, ok := m.sessions[req.GetAgentSessionId()]; ok && s.thread != nil {
		m.mu.Unlock()
		return nil, derr.New(codes.AlreadyExists, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, "session already belongs to thread "+s.thread.id, nil)
	}
	t := &thread{id: id, agent: agent, cwd: m.opts.Home, createdBy: req.GetImportedBy(), createdAt: m.clock.Now(), imported: true, dirty: true}
	m.threads[id] = t
	s := m.newSessionLocked(t, req.GetAgentSessionId())
	s.attached = false
	m.mu.Unlock()

	params := map[string]any{"sessionId": s.id, "cwd": s.cwd, "mcpServers": m.mcpServers(c, id)}
	method := acp.MethodSessionLoad
	if c.caps.resume && c.caps.replay {
		method = acp.MethodSessionResume
		params["replayFrom"] = "start"
	}
	res, err := c.call(ctx, method, params)
	m.mu.Lock()
	if err != nil {
		delete(m.threads, id)
		delete(m.sessions, s.id)
		m.mu.Unlock()
		return nil, ToStatus(agentFailure(err, method))
	}
	if cwd := acp.Str(res, "cwd"); cwd != "" {
		s.cwd, t.cwd = cwd, cwd
	}
	s.attached = true
	sessionResult(s, res)
	m.settleSessionLocked(s)
	m.dirty = true
	autonomy := clampAutonomy(min(m.autonomyDefaultLocked(), m.autonomyMaxLocked()), m.supportedLevelsLocked(agent, s))
	m.mu.Unlock()
	if err := m.applyAutonomy(ctx, c, t, autonomy); err != nil {
		m.log.Warn("imported thread autonomy", "thread", id, "err", err)
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	m.flushLocked()
	return m.threadRowLocked(t), nil
}

// ResumeThread reopens a closed thread or reattaches a detached one.
func (m *Manager) ResumeThread(ctx context.Context, ref *devboxv1.ThreadRef, replay bool) (*devboxv1.Session, error) {
	m.mu.Lock()
	t, err := m.threadLocked(ref)
	if err != nil {
		m.mu.Unlock()
		return nil, err
	}
	agent := t.agent
	m.mu.Unlock()
	c, err := m.connection(ctx, agent)
	if err != nil {
		return nil, ToStatus(err)
	}
	if err := m.ensureAttached(ctx, c, t, replay); err != nil {
		return nil, err
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	t.closed = false
	t.dirty, m.dirty = true, true
	m.flushLocked()
	return m.threadRowLocked(t), nil
}

// CloseThread cancels the thread's turn and closes its session (`session/close`, or just drops it).
func (m *Manager) CloseThread(ctx context.Context, ref *devboxv1.ThreadRef) (*devboxv1.Session, error) {
	t, _, err := m.closeThread(ctx, ref)
	if err != nil {
		return nil, err
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	m.flushLocked()
	return m.threadRowLocked(t), nil
}

func (m *Manager) closeThread(ctx context.Context, ref *devboxv1.ThreadRef) (*thread, *agentConn, error) {
	m.mu.Lock()
	t, err := m.threadLocked(ref)
	if err != nil {
		m.mu.Unlock()
		return nil, nil, err
	}
	m.removeFromWaitLocked(t)
	t.queue = nil
	running := t.running
	c := m.conns[t.agent]
	s := t.session
	m.mu.Unlock()
	if running && c != nil && s != nil {
		_ = m.cancelTurn(ctx, c, t)
	}
	if c != nil && c.alive() && s != nil && s.attached && c.caps.close {
		if _, err := c.call(ctx, acp.MethodSessionClose, map[string]any{"sessionId": s.id}); err != nil && !acp.IsMethodNotFound(err) {
			m.log.Warn("session/close failed", "thread", t.id, "err", err)
		}
	}
	m.mu.Lock()
	t.closed = true
	if s != nil {
		s.attached = false
		for _, child := range m.childrenLocked(s.id) {
			child.attached = false
		}
	}
	t.dirty, m.dirty = true, true
	m.mu.Unlock()
	return t, c, nil
}

// DeleteThread closes the thread and deletes the agent-side session when the agent supports it.
func (m *Manager) DeleteThread(ctx context.Context, ref *devboxv1.ThreadRef) (*devboxv1.Session, bool, error) {
	t, c, err := m.closeThread(ctx, ref)
	if err != nil {
		return nil, false, err
	}
	deleted := false
	if c == nil {
		m.mu.Lock()
		agent := t.agent
		m.mu.Unlock()
		c, _ = m.connection(ctx, agent)
	}
	m.mu.Lock()
	s := t.session
	m.mu.Unlock()
	if c != nil && s != nil && c.caps.delete {
		if _, err := c.call(ctx, acp.MethodSessionDelete, map[string]any{"sessionId": s.id}); err != nil {
			m.log.Warn("session/delete failed", "thread", t.id, "err", err)
		} else {
			deleted = true
		}
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	t.deleted = true
	t.dirty, m.dirty = true, true
	if s != nil {
		for _, child := range m.childrenLocked(s.id) {
			delete(m.sessions, child.id)
		}
		delete(m.sessions, s.id)
	}
	m.flushLocked()
	return m.threadRowLocked(t), deleted, nil
}

// ForkThread forks the thread's session into a new thread (`session/fork`). UNSUPPORTED when not advertised.
func (m *Manager) ForkThread(ctx context.Context, req *devboxv1.ForkThreadRequest) (*devboxv1.Session, error) {
	m.mu.Lock()
	t, err := m.threadLocked(req.GetThread())
	if err != nil {
		m.mu.Unlock()
		return nil, err
	}
	agent := t.agent
	m.mu.Unlock()
	c, err := m.connection(ctx, agent)
	if err != nil {
		return nil, ToStatus(err)
	}
	if !c.caps.fork {
		return nil, derr.Unsupported("fork")
	}
	if err := m.ensureAttached(ctx, c, t, false); err != nil {
		return nil, err
	}
	newID := req.GetNewThreadId()
	if newID == "" {
		newID = uuid.NewString()
	}
	m.mu.Lock()
	src := t.session
	cwd := src.cwd
	m.mu.Unlock()
	res, err := c.call(ctx, acp.MethodSessionFork, map[string]any{"sessionId": src.id, "cwd": cwd, "mcpServers": m.mcpServers(c, newID)})
	if err != nil {
		if acp.IsMethodNotFound(err) {
			return nil, derr.Unsupported("fork")
		}
		return nil, ToStatus(agentFailure(err, "session/fork"))
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	nt := &thread{
		id: newID, agent: agent, cwd: cwd, worktrees: t.worktrees, createdBy: req.GetRequestedBy(), createdAt: m.clock.Now(),
		title: req.GetTitle(), model: t.model, autonomy: t.autonomy, dirty: true,
	}
	m.threads[newID] = nt
	ns := m.newSessionLocked(nt, acp.Str(res, "sessionId"))
	ns.options = nil
	for _, o := range src.options {
		ns.options = append(ns.options, &cfgOption{raw: acp.CloneJSON(o.raw).(map[string]any), synthetic: o.synthetic})
	}
	ns.commands = src.commands
	sessionResult(ns, res)
	m.syncAutonomyLocked(ns)
	m.dirty = true
	m.flushLocked()
	return m.threadRowLocked(nt), nil
}

// ListCommands returns a session's live slash commands.
func (m *Manager) ListCommands(ref *devboxv1.ThreadRef, sessionID string) ([]*devboxv1.AvailableCommand, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if sessionID != "" {
		if s, ok := m.sessions[sessionID]; ok {
			return s.commands, nil
		}
		return nil, derr.ThreadNotFound(sessionID)
	}
	t, err := m.threadLocked(ref)
	if err != nil {
		return nil, err
	}
	if t.session == nil {
		return nil, nil
	}
	return t.session.commands, nil
}

// SetAgentBilling restarts one agent's connection with new billing and resumes its open threads on it.
func (m *Manager) SetAgentBilling(ctx context.Context, launch *devboxv1.AgentLaunch) (*devboxv1.AgentConnection, []string, error) {
	agent := launch.GetAgent()
	m.mu.Lock()
	m.launches[agent] = launch
	old := m.conns[agent]
	var threads []*thread
	for _, t := range m.threads {
		if t.agent == agent && t.open() && t.session != nil {
			threads = append(threads, t)
			if t.turnCancel != nil {
				t.turnCancel()
			}
		}
	}
	m.mu.Unlock()
	if old != nil {
		old.stop(5 * time.Second)
		m.mu.Lock()
		if m.conns[agent] == old {
			delete(m.conns, agent)
			m.detachSessionsLocked(agent)
		}
		m.mu.Unlock()
	}
	c, err := m.connection(ctx, agent)
	if err != nil {
		return nil, nil, ToStatus(err)
	}
	sort.Slice(threads, func(i, j int) bool { return threads[i].id < threads[j].id })
	var resumed []string
	for _, t := range threads {
		if err := m.ensureAttached(ctx, c, t, false); err != nil {
			m.log.Warn("resume after billing switch", "thread", t.id, "err", err)
			continue
		}
		resumed = append(resumed, t.id)
	}
	m.mu.Lock()
	m.dirty = true
	m.flushLocked()
	m.mu.Unlock()
	return c.info(), resumed, nil
}

// StopAgents stops agent connections (PrepareSuspend for shared snapshots stops subscription Codex). Threads
// reattach on the next prompt.
func (m *Manager) StopAgents(match func(devboxv1.AgentType, devboxv1.BillingMode) bool) []devboxv1.AgentType {
	m.mu.Lock()
	var stop []*agentConn
	for t, c := range m.conns {
		if match(t, c.spec.Billing) {
			stop = append(stop, c)
			delete(m.conns, t)
			m.detachSessionsLocked(t)
		}
	}
	m.dirty = true
	m.mu.Unlock()
	out := make([]devboxv1.AgentType, 0, len(stop))
	for _, c := range stop {
		c.stop(5 * time.Second)
		out = append(out, c.agent)
	}
	return out
}

// Forget drops every thread and its transcript and stops every connection: the box was restored from a snapshot
// as a new instance, whose console has none of the old instance's threads. Agent-side sessions stay importable.
func (m *Manager) Forget() {
	m.StopAgents(func(devboxv1.AgentType, devboxv1.BillingMode) bool { return true })
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, t := range m.threads {
		if t.turnCancel != nil {
			t.turnCancel()
		}
	}
	m.threads = map[string]*thread{}
	m.sessions = map[string]*session{}
	m.interactions = map[string]*interaction{}
	m.pending = nil
	m.waitQ = nil
	m.running = 0
	m.lastAgg = ""
	m.unwritten = map[entityRef]*devboxv1.AcpEntity{}
	if err := m.opts.Transcript.Reset(m.ctx); err != nil {
		m.log.Error("resetting transcript", "err", err)
	}
	m.dirty = true
	if err := m.saveLocked(); err != nil {
		m.log.Error("persist threads", "err", err)
	}
}

// Launch returns the launch settings for an agent.
func (m *Manager) Launch(t devboxv1.AgentType) *devboxv1.AgentLaunch {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.launchForLocked(t)
}
