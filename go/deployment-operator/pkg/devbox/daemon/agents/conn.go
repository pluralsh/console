package agents

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os/exec"
	"strings"
	"sync"
	"time"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/acp"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/derr"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/harness"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/proc"
)

// initializeTimeout bounds the harness's `initialize` handshake (adapters may install themselves on first run).
const initializeTimeout = 60 * time.Second

// stateRunning is both a live connection's state and the ACP foreground state of a busy session.
const stateRunning = "running"

// caps is what the daemon reads from `initialize`.
type caps struct {
	protocolVersion int
	raw             acp.Object
	load            bool
	list            bool
	resume          bool
	close           bool
	delete          bool
	fork            bool
	replay          bool
	mcpHTTP         bool
	promptImage     bool
	promptAudio     bool
	promptEmbedded  bool
	elicitation     bool
	subagents       bool
	authMethods     []acp.Object
	agentName       string
	agentVersion    string
}

func parseCaps(res acp.Object) caps {
	c := caps{raw: acp.Obj(res, "agentCapabilities")}
	if v, ok := acp.Int(res, "protocolVersion"); ok {
		c.protocolVersion = int(v)
	}
	ac := c.raw
	c.load = acp.Bool(ac, "loadSession")
	sc := acp.Obj(ac, "sessionCapabilities")
	present := func(o acp.Object, k string) bool { return o != nil && acp.Has(o, k) && o[k] != nil && o[k] != false }
	c.list = present(sc, "list")
	c.resume = present(sc, "resume")
	c.close = present(sc, "close")
	c.delete = present(sc, "delete")
	c.fork = present(sc, "fork")
	if r := acp.Obj(sc, "resume"); r != nil {
		c.replay = present(r, "replay") || present(r, "replayFrom")
	}
	if c.protocolVersion >= 2 {
		// v2 makes resume-with-replay the way to load history.
		c.replay = c.replay || c.resume
		c.subagents = true
	}
	c.mcpHTTP = acp.Bool(acp.Obj(ac, "mcpCapabilities"), "http")
	pc := acp.Obj(ac, "promptCapabilities")
	c.promptImage, c.promptAudio, c.promptEmbedded = acp.Bool(pc, "image"), acp.Bool(pc, "audio"), acp.Bool(pc, "embeddedContext")
	c.elicitation = present(ac, "elicitation")
	for _, m := range acp.Arr(res, "authMethods") {
		if o, ok := m.(map[string]any); ok {
			c.authMethods = append(c.authMethods, o)
		}
	}
	if info := acp.Obj(res, "agentInfo"); info != nil {
		c.agentName, c.agentVersion = acp.Str(info, "name"), acp.Str(info, "version")
	}
	return c
}

func (c caps) proto() *devboxv1.AgentCapabilities {
	return &devboxv1.AgentCapabilities{
		Lifecycle: &devboxv1.LifecycleSupport{
			List: c.list, Resume: c.resume, Load: c.load, Close: c.close, Delete: c.delete, Fork: c.fork, Replay: c.replay,
		},
		PromptImage: c.promptImage, PromptAudio: c.promptAudio, PromptEmbeddedContext: c.promptEmbedded,
		McpHttp: c.mcpHTTP, Subagents: c.subagents, Elicitation: c.elicitation, Raw: acp.StructOf(c.raw),
	}
}

// canReattach is whether a session can be reopened on a new process.
func (c caps) canReattach() bool { return c.resume || c.load }

// agentConn is the single ACP connection for one agent type.
type agentConn struct {
	m       *Manager
	agent   devboxv1.AgentType
	spec    *harness.Spec
	launch  *devboxv1.AgentLaunch
	conn    *acp.Conn
	process *proc.Process
	norm    acp.Normalizer
	caps    caps

	mu      sync.Mutex
	state   string
	lastErr *devboxv1.AgentError
	stdin   io.Closer
	stopped bool
}

func (c *agentConn) info() *devboxv1.AgentConnection {
	c.mu.Lock()
	defer c.mu.Unlock()
	out := &devboxv1.AgentConnection{
		Agent: c.agent, ProtocolVersion: int32(c.caps.protocolVersion), AdapterName: c.caps.agentName,
		AdapterVersion: c.caps.agentVersion, Capabilities: c.caps.proto(), Billing: c.spec.Billing, State: c.state, Error: c.lastErr,
	}
	return out
}

func (c *agentConn) alive() bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.state == stateRunning
}

func (c *agentConn) call(ctx context.Context, method string, params any) (acp.Object, error) {
	raw, err := c.conn.Call(ctx, method, params)
	if err != nil {
		return nil, err
	}
	if len(raw) == 0 || string(raw) == "null" {
		return acp.Object{}, nil
	}
	return acp.DecodeObject(raw)
}

func (c *agentConn) stop(grace time.Duration) {
	c.mu.Lock()
	c.stopped = true
	c.state = "stopped"
	stdin := c.stdin
	p := c.process
	c.mu.Unlock()
	if stdin != nil {
		_ = stdin.Close()
	}
	if p != nil {
		_ = c.m.opts.Supervisor.Stop(p, grace)
	}
}

// launchFor returns the instance's launch settings for an agent (proxy billing when Initialize didn't list it).
func (m *Manager) launchForLocked(t devboxv1.AgentType) *devboxv1.AgentLaunch {
	if l, ok := m.launches[t]; ok {
		return l
	}
	return &devboxv1.AgentLaunch{Agent: t, Billing: devboxv1.BillingMode_BILLING_MODE_PROXY}
}

// connection returns the agent's running connection, starting it if needed. Concurrent callers share one start.
func (m *Manager) connection(ctx context.Context, t devboxv1.AgentType) (*agentConn, error) {
	for {
		m.mu.Lock()
		if c, ok := m.conns[t]; ok && c.alive() {
			m.mu.Unlock()
			return c, nil
		}
		if wait, ok := m.starting[t]; ok {
			m.mu.Unlock()
			select {
			case <-wait:
				continue
			case <-ctx.Done():
				return nil, ctx.Err()
			}
		}
		done := make(chan struct{})
		m.starting[t] = done
		launch := m.launchForLocked(t)
		model := ""
		if t == m.defaultAgent {
			model = m.defaultModel
		}
		m.mu.Unlock()

		c, err := m.startConn(ctx, launch, model)

		m.mu.Lock()
		delete(m.starting, t)
		close(done)
		if err != nil {
			m.mu.Unlock()
			return nil, err
		}
		if old := m.conns[t]; old != nil && old != c {
			m.detachSessionsLocked(t)
		}
		m.conns[t] = c
		m.dirty = true
		m.mu.Unlock()
		if m.opts.OnAgentProcess != nil {
			m.opts.OnAgentProcess(t, true)
		}
		return c, nil
	}
}

func (m *Manager) startConn(ctx context.Context, launch *devboxv1.AgentLaunch, bootModel string) (*agentConn, error) {
	if m.opts.Launcher == nil {
		return nil, errors.New("no agent launcher configured")
	}
	spec, err := m.opts.Launcher.Spec(launch, m.opts.Endpoints(), bootModel)
	if err != nil {
		return nil, derr.InvalidAgentOrModel(err.Error())
	}
	c := &agentConn{m: m, agent: launch.GetAgent(), spec: spec, launch: launch, state: "starting"}
	cmd := exec.Command(spec.Path, spec.Args...)
	cmd.Env = spec.Env
	cmd.Dir = spec.Dir
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, err
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}
	cmd.Stderr = &logWriter{log: m.log.With("agent", harness.AgentName(c.agent)), prefix: "stderr"}
	name := "agent-" + harness.AgentName(c.agent)
	p, err := m.opts.Supervisor.Spawn(name, cmd, cmd.Start, false)
	if err != nil {
		return nil, fmt.Errorf("start %s: %w", spec.Path, err)
	}
	c.process, c.stdin = p, stdin
	c.conn = acp.NewConn(stdin, stdout, &connHandler{c: c}, m.log.With("agent", harness.AgentName(c.agent)))
	go c.watch()

	version := 1
	if spec.RequestV2 {
		version = 2
	}
	ictx, cancel := context.WithTimeout(ctx, initializeTimeout)
	defer cancel()
	res, err := c.call(ictx, acp.MethodInitialize, map[string]any{
		"protocolVersion": version,
		"clientCapabilities": map[string]any{
			"fs":          map[string]any{"readTextFile": true, "writeTextFile": true},
			"terminal":    true,
			"elicitation": map[string]any{"form": map[string]any{}, "url": map[string]any{}},
		},
		"clientInfo": map[string]any{"name": "devbox-daemon", "title": "Plural DevBox", "version": Version},
	})
	if err != nil {
		c.stop(time.Second)
		return nil, agentFailure(err, "initialize")
	}
	c.caps = parseCaps(res)
	if c.caps.protocolVersion == 0 {
		c.caps.protocolVersion = version
	}
	c.norm = acp.NewNormalizer(c.caps.protocolVersion, spec.Lineage)
	if id := spec.AuthMethodID; id != "" && hasAuthMethod(c.caps.authMethods, id) {
		if _, err := c.call(ictx, acp.MethodAuthenticate, map[string]any{"methodId": id}); err != nil {
			c.stop(time.Second)
			return nil, agentFailure(err, "authenticate")
		}
	}
	c.mu.Lock()
	c.state = stateRunning
	c.mu.Unlock()
	m.log.Info("agent connected", "agent", harness.AgentName(c.agent), "protocol", c.caps.protocolVersion,
		"adapter", c.caps.agentName, "adapterVersion", c.caps.agentVersion, "billing", spec.Billing.String())
	return c, nil
}

func hasAuthMethod(methods []acp.Object, id string) bool {
	for _, m := range methods {
		if acp.Str(m, "id") == id {
			return true
		}
	}
	return false
}

// watch marks the connection failed when the harness exits and fails its running turns.
func (c *agentConn) watch() {
	<-c.process.Done()
	c.mu.Lock()
	stopped := c.stopped
	if !stopped {
		c.state = "failed"
		msg := "agent process exited"
		if err := c.process.Err(); err != nil {
			msg += ": " + err.Error()
		}
		c.lastErr = &devboxv1.AgentError{Message: msg, Detail: &devboxv1.ErrorDetail{Message: msg}}
	}
	c.mu.Unlock()
	m := c.m
	m.mu.Lock()
	if m.conns[c.agent] == c {
		m.detachSessionsLocked(c.agent)
		if !stopped {
			m.emitConditionLocked("agent_exited", "warning", fmt.Sprintf("%s exited; it restarts on the next prompt", harness.AgentName(c.agent)), true)
		}
		m.dirty = true
	}
	m.mu.Unlock()
	if m.opts.OnAgentProcess != nil {
		m.opts.OnAgentProcess(c.agent, false)
	}
}

func (m *Manager) detachSessionsLocked(t devboxv1.AgentType) {
	for _, s := range m.sessions {
		if s.agent == t {
			s.attached = false
		}
	}
	for _, in := range m.interactions {
		if in.session != nil && in.session.agent == t && in.proto.GetState() == devboxv1.InteractionState_INTERACTION_STATE_PENDING {
			m.resolveInteractionLocked(in, devboxv1.InteractionState_INTERACTION_STATE_EXPIRED, nil, nil)
		}
	}
}

// connHandler serves agent -> client calls for one connection.
type connHandler struct{ c *agentConn }

func (h *connHandler) HandleNotification(ctx context.Context, method string, params json.RawMessage) {
	switch method {
	case acp.MethodSessionUpdate:
		h.c.m.onSessionUpdate(h.c, params)
	case acp.MethodElicitationDone:
		h.c.m.onElicitationComplete(params)
	}
}

func (h *connHandler) HandleRequest(ctx context.Context, method string, params json.RawMessage) (any, *acp.RequestError) {
	m := h.c.m
	switch method {
	case acp.MethodRequestPermission:
		return m.onPermissionRequest(ctx, h.c, params)
	case acp.MethodElicitationCreate:
		return m.onElicitation(ctx, h.c, params)
	case acp.MethodReadTextFile:
		return m.clientReadTextFile(params)
	case acp.MethodWriteTextFile:
		return m.clientWriteTextFile(params)
	case acp.MethodTerminalCreate, acp.MethodTerminalOutput, acp.MethodTerminalWait, acp.MethodTerminalKill, acp.MethodTerminalRelease:
		return m.clientTerminal(ctx, h.c, method, params)
	}
	return nil, &acp.RequestError{Code: -32601, Message: "method not found: " + method}
}

// agentFailure classifies an agent JSON-RPC error into a typed thread error (section 4.6b): auth failures and
// plan limits become AGENT_AUTH_FAILED / PLAN_LIMIT_REACHED, so console can offer "Switch to Plural AI proxy".
func agentFailure(err error, op string) error {
	ae := agentErrorOf(err)
	return &AgentCallError{Op: op, Err: ae, cause: err}
}

// AgentCallError is a failed agent call with its typed error.
type AgentCallError struct {
	Op    string
	Err   *devboxv1.AgentError
	cause error
}

func (e *AgentCallError) Error() string { return e.Op + ": " + e.Err.GetMessage() }
func (e *AgentCallError) Unwrap() error { return e.cause }

func agentErrorOf(err error) *devboxv1.AgentError {
	if err == nil {
		return nil
	}
	var ae *AgentCallError
	if errors.As(err, &ae) {
		return ae.Err
	}
	out := &devboxv1.AgentError{Message: err.Error()}
	reason := devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED
	text := strings.ToLower(err.Error())
	if re, ok := acp.AsRequestError(err); ok {
		out.Code = int32(re.Code)
		out.Message = re.Message
		if re.Data != nil {
			out.Data = acp.ValueOf(normalizeData(re.Data), true)
			text += " " + strings.ToLower(string(acp.MustJSON(re.Data)))
		}
		text += " " + strings.ToLower(re.Message)
		if re.Code == -32000 {
			// ACP's auth_required.
			reason = devboxv1.ErrorReason_ERROR_REASON_AGENT_AUTH_FAILED
		}
	}
	switch {
	case containsAny(text, "usage limit", "rate limit", "plan limit", "quota", "429", "too many requests", "limit reached", "credit balance"):
		reason = devboxv1.ErrorReason_ERROR_REASON_PLAN_LIMIT_REACHED
	case containsAny(text, "401", "403", "unauthorized", "authentication", "auth required", "not logged in", "invalid api key", "invalid x-api-key", "oauth", "login"):
		reason = devboxv1.ErrorReason_ERROR_REASON_AGENT_AUTH_FAILED
	}
	if reason != devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED {
		out.Detail = &devboxv1.ErrorDetail{Reason: reason, Message: out.Message}
	}
	return out
}

func normalizeData(v any) any {
	raw, err := json.Marshal(v)
	if err != nil {
		return nil
	}
	out, _ := acp.Decode(raw)
	return out
}

func containsAny(s string, subs ...string) bool {
	for _, sub := range subs {
		if strings.Contains(s, sub) {
			return true
		}
	}
	return false
}

// logWriter logs harness stderr line by line.
type logWriter struct {
	log    interface{ Debug(string, ...any) }
	prefix string
	mu     sync.Mutex
	buf    []byte
}

func (w *logWriter) Write(p []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.buf = append(w.buf, p...)
	for {
		i := strings.IndexByte(string(w.buf), '\n')
		if i < 0 {
			break
		}
		w.log.Debug(w.prefix, "line", string(w.buf[:i]))
		w.buf = w.buf[i+1:]
	}
	if len(w.buf) > 64<<10 {
		w.log.Debug(w.prefix, "line", string(w.buf))
		w.buf = w.buf[:0]
	}
	return len(p), nil
}
