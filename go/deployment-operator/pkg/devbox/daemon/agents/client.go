package agents

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"syscall"

	"github.com/google/uuid"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/acp"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/internal/fsutil"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/proc"
)

// defaultTerminalOutputLimit caps retained output of agent-created terminals.
const defaultTerminalOutputLimit = 1 << 20

func invalidParams(err error) *acp.RequestError {
	return &acp.RequestError{Code: -32602, Message: err.Error()}
}

func internalError(err error) *acp.RequestError {
	return &acp.RequestError{Code: -32603, Message: err.Error()}
}

func (m *Manager) clientReadTextFile(params json.RawMessage) (any, *acp.RequestError) {
	p, err := acp.DecodeObject(params)
	if err != nil {
		return nil, invalidParams(err)
	}
	path := acp.Str(p, "path")
	if !filepath.IsAbs(path) {
		return nil, invalidParams(errors.New("path must be absolute"))
	}
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, &acp.RequestError{Code: -32002, Message: "resource not found: " + path}
		}
		return nil, internalError(err)
	}
	content := string(data)
	line, hasLine := acp.Int(p, "line")
	limit, hasLimit := acp.Int(p, "limit")
	if hasLine || hasLimit {
		lines := strings.SplitAfter(content, "\n")
		start := 0
		if hasLine && line > 1 {
			start = int(line - 1)
		}
		if start > len(lines) {
			start = len(lines)
		}
		end := len(lines)
		if hasLimit && limit >= 0 && start+int(limit) < end {
			end = start + int(limit)
		}
		content = strings.Join(lines[start:end], "")
	}
	return map[string]any{"content": content}, nil
}

func (m *Manager) clientWriteTextFile(params json.RawMessage) (any, *acp.RequestError) {
	p, err := acp.DecodeObject(params)
	if err != nil {
		return nil, invalidParams(err)
	}
	path := acp.Str(p, "path")
	if !filepath.IsAbs(path) {
		return nil, invalidParams(errors.New("path must be absolute"))
	}
	mode := os.FileMode(0o644)
	if st, err := os.Stat(path); err == nil {
		mode = st.Mode().Perm()
	}
	if err := fsutil.WriteFileAtomic(path, []byte(acp.Str(p, "content")), mode); err != nil {
		return nil, internalError(err)
	}
	return map[string]any{}, nil
}

// clientTerminal is a command an agent runs through the client (`terminal/*`). Its output is shown on the
// timeline as a TERMINAL entity.
type clientTerminal struct {
	id      string
	session string
	cmd     *exec.Cmd
	limit   int
	mu      sync.Mutex
	out     bytes.Buffer
	trunc   bool
	done    chan struct{}
	exit    map[string]any
}

func (t *clientTerminal) Write(p []byte) (int, error) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.out.Write(p)
	if over := t.out.Len() - t.limit; over > 0 {
		b := t.out.Bytes()[over:]
		// Keep the cut on a UTF-8 boundary.
		for len(b) > 0 && b[0]&0xC0 == 0x80 {
			b = b[1:]
		}
		rest := append([]byte(nil), b...)
		t.out.Reset()
		t.out.Write(rest)
		t.trunc = true
	}
	return len(p), nil
}

func (t *clientTerminal) snapshot() (string, bool, map[string]any) {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.out.String(), t.trunc, t.exit
}

func (m *Manager) clientTerminal(ctx context.Context, c *agentConn, method string, params json.RawMessage) (any, *acp.RequestError) {
	p, err := acp.DecodeObject(params)
	if err != nil {
		return nil, invalidParams(err)
	}
	if method == acp.MethodTerminalCreate {
		return m.createClientTerminal(p)
	}
	id := acp.Str(p, "terminalId")
	m.termMu.Lock()
	t := m.terms[id]
	m.termMu.Unlock()
	if t == nil {
		return nil, &acp.RequestError{Code: -32002, Message: "terminal not found: " + id}
	}
	switch method {
	case acp.MethodTerminalOutput:
		out, trunc, exit := t.snapshot()
		res := map[string]any{"output": out, "truncated": trunc}
		if exit != nil {
			res["exitStatus"] = exit
		}
		return res, nil
	case acp.MethodTerminalWait:
		select {
		case <-t.done:
		case <-ctx.Done():
			return nil, internalError(ctx.Err())
		}
		_, _, exit := t.snapshot()
		return exit, nil
	case acp.MethodTerminalKill:
		if t.cmd.Process != nil {
			_ = syscall.Kill(-t.cmd.Process.Pid, syscall.SIGKILL)
		}
		return map[string]any{}, nil
	case acp.MethodTerminalRelease:
		if t.cmd.Process != nil {
			select {
			case <-t.done:
			default:
				_ = syscall.Kill(-t.cmd.Process.Pid, syscall.SIGKILL)
			}
		}
		m.termMu.Lock()
		delete(m.terms, id)
		m.termMu.Unlock()
		return map[string]any{}, nil
	}
	return nil, &acp.RequestError{Code: -32601, Message: "method not found: " + method}
}

func (m *Manager) createClientTerminal(p acp.Object) (any, *acp.RequestError) {
	command := acp.Str(p, "command")
	if command == "" {
		return nil, invalidParams(errors.New("command is required"))
	}
	var args []string
	for _, a := range acp.Arr(p, "args") {
		if s, ok := a.(string); ok {
			args = append(args, s)
		}
	}
	cwd := acp.Str(p, "cwd")
	if cwd == "" {
		cwd = m.opts.Home
	}
	limit := defaultTerminalOutputLimit
	if l, ok := acp.Int(p, "outputByteLimit"); ok && l > 0 && l < int64(limit) {
		limit = int(l)
	}
	cmd := exec.Command(command, args...)
	cmd.Dir = cwd
	cmd.Env = os.Environ()
	for _, e := range acp.Arr(p, "env") {
		if eo, ok := e.(map[string]any); ok {
			cmd.Env = append(cmd.Env, acp.Str(eo, "name")+"="+acp.Str(eo, "value"))
		}
	}
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	t := &clientTerminal{id: "term-" + uuid.NewString(), session: acp.Str(p, "sessionId"), cmd: cmd, limit: limit, done: make(chan struct{})}
	cmd.Stdout, cmd.Stderr = t, t
	if err := proc.Start(cmd, cmd.Start); err != nil {
		return nil, internalError(err)
	}
	m.termMu.Lock()
	if m.terms == nil {
		m.terms = map[string]*clientTerminal{}
	}
	m.terms[t.id] = t
	m.termMu.Unlock()
	m.terminalEntity(t, command, args, cwd)
	go func() {
		err := proc.Wait(cmd)
		exit := map[string]any{}
		var ee *exec.ExitError
		switch {
		case err == nil:
			exit["exitCode"] = 0
		case errors.As(err, &ee):
			if ws, ok := ee.Sys().(syscall.WaitStatus); ok && ws.Signaled() {
				exit["signal"] = ws.Signal().String()
			} else {
				exit["exitCode"] = ee.ExitCode()
			}
		default:
			exit["exitCode"] = -1
		}
		t.mu.Lock()
		t.exit = exit
		t.mu.Unlock()
		close(t.done)
		m.terminalEntity(t, command, args, cwd)
	}()
	return map[string]any{"terminalId": t.id}, nil
}

// terminalEntity publishes the terminal's current state as a TERMINAL entity patch.
func (m *Manager) terminalEntity(t *clientTerminal, command string, args []string, cwd string) {
	out, trunc, exit := t.snapshot()
	argv := make([]any, 0, len(args))
	for _, a := range args {
		argv = append(argv, a)
	}
	patch := acp.Object{"command": command, "args": argv, "cwd": cwd, "output": out, "truncated": trunc}
	if exit != nil {
		patch["exitStatus"] = exit
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	s := m.sessions[t.session]
	if s == nil {
		return
	}
	payload := acp.CloneJSON(patch).(map[string]any)
	payload["sessionUpdate"] = "terminal_update"
	payload["terminalId"] = t.id
	if m.applyEntityLocked(s, acp.Change{
		Kind: acp.ChangePatch, SessionID: s.id, EntityType: devboxv1.EntityType_ENTITY_TYPE_TERMINAL, EntityID: t.id,
		Patch: patch, Payload: payload, Complete: exit != nil,
	}) {
		m.markDirtyLocked(s)
	}
}
