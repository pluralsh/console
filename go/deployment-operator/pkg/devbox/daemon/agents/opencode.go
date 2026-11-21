package agents

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/acp"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/harness"
)

// OpenCode runs each `task` subagent as a child session that its ACP layer never streams: the adapter drops events
// for sessions it hasn't opened, the child's permission requests included, which then wait forever. The daemon
// watches OpenCode's own event stream for task tool parts naming their child session and resumes the child over
// ACP, which opens it in the adapter: from then on the child's updates and permission requests arrive on its own
// session ID. The task part names the child before the child's first model call, so the resume (two local HTTP
// calls in the adapter) lands well before the child can stream or ask anything.
const (
	openCodeTaskTool = "task"
	// openCodeEventLine bounds one event: part updates carry the tool's whole input and output.
	openCodeEventLine = 32 << 20
	openCodeRetry     = time.Second
	openCodeAttach    = 30 * time.Second
)

// openCodeEvent is the part of an OpenCode /global/event message the daemon reads.
type openCodeEvent struct {
	Payload struct {
		Type       string `json:"type"`
		Properties struct {
			Part struct {
				Type      string `json:"type"`
				Tool      string `json:"tool"`
				CallID    string `json:"callID"`
				SessionID string `json:"sessionID"`
				State     struct {
					Title string `json:"title"`
					Input struct {
						Description string `json:"description"`
						Prompt      string `json:"prompt"`
					} `json:"input"`
					Metadata struct {
						SessionID       string `json:"sessionId"`
						ParentSessionID string `json:"parentSessionId"`
					} `json:"metadata"`
				} `json:"state"`
			} `json:"part"`
		} `json:"properties"`
	} `json:"payload"`
}

// watchOpenCodeSubagents follows the server's event stream until the harness exits, reconnecting as needed.
func (c *agentConn) watchOpenCodeSubagents(srv *harness.OpenCodeServer) {
	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		<-c.process.Done()
		cancel()
	}()
	seen := map[string]bool{}
	for {
		if err := c.streamOpenCodeEvents(ctx, srv, seen); err != nil && ctx.Err() == nil {
			c.m.log.Debug("opencode event stream", "err", err)
		}
		select {
		case <-ctx.Done():
			return
		case <-time.After(openCodeRetry):
		}
	}
}

func (c *agentConn) streamOpenCodeEvents(ctx context.Context, srv *harness.OpenCodeServer, seen map[string]bool) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, srv.URL+"/global/event", nil)
	if err != nil {
		return err
	}
	req.SetBasicAuth(srv.Username, srv.Password)
	req.Header.Set("Accept", "text/event-stream")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("status %s", res.Status)
	}
	sc := bufio.NewScanner(res.Body)
	sc.Buffer(make([]byte, 64<<10), openCodeEventLine)
	var data []byte
	for sc.Scan() {
		line := sc.Bytes()
		if len(line) == 0 {
			if len(data) > 0 {
				c.onOpenCodeEvent(data, seen)
			}
			data = data[:0]
			continue
		}
		if v, ok := bytes.CutPrefix(line, []byte("data:")); ok {
			if len(data) > 0 {
				data = append(data, '\n')
			}
			data = append(data, bytes.TrimPrefix(v, []byte(" "))...)
		}
	}
	return sc.Err()
}

func (c *agentConn) onOpenCodeEvent(data []byte, seen map[string]bool) {
	var ev openCodeEvent
	if json.Unmarshal(data, &ev) != nil || ev.Payload.Type != "message.part.updated" {
		return
	}
	part := ev.Payload.Properties.Part
	child := part.State.Metadata.SessionID
	if part.Type != "tool" || part.Tool != openCodeTaskTool || child == "" || seen[child] {
		return
	}
	parent := part.State.Metadata.ParentSessionID
	if parent == "" {
		parent = part.SessionID
	}
	title := part.State.Title
	if title == "" {
		title = part.State.Input.Description
	}
	seen[child] = true
	go c.m.attachOpenCodeChild(c, &acp.Lineage{ParentSessionID: parent, ChildSessionID: child, ParentToolCallID: part.CallID, Title: title}, part.State.Input.Prompt)
}

// attachOpenCodeChild adds a task subagent's session under the tool call that spawned it and opens it in the adapter.
func (m *Manager) attachOpenCodeChild(c *agentConn, l *acp.Lineage, task string) {
	m.mu.Lock()
	parent := m.sessions[l.ParentSessionID]
	if parent == nil || parent.agent != c.agent || m.conns[c.agent] != c {
		m.mu.Unlock()
		return
	}
	if m.sessions[l.ChildSessionID] == nil {
		child := m.subagentLocked(c, l)
		if child == nil {
			m.mu.Unlock()
			return
		}
		if task != "" {
			m.applyEntityLocked(child, acp.TaskMessage(child.id, task))
		}
		m.markDirtyLocked(child)
	}
	cwd := parent.cwd
	m.mu.Unlock()

	method := acp.MethodSessionResume
	if !c.caps.resume {
		method = acp.MethodSessionLoad
	}
	ctx, cancel := context.WithTimeout(context.Background(), openCodeAttach)
	defer cancel()
	if _, err := c.call(ctx, method, map[string]any{"sessionId": l.ChildSessionID, "cwd": cwd, "mcpServers": []any{}}); err != nil {
		m.log.Warn("open opencode subagent session", "session", l.ChildSessionID, "err", err)
		return
	}
	m.mu.Lock()
	if s := m.sessions[l.ChildSessionID]; s != nil {
		s.attached = true
	}
	m.mu.Unlock()
}
