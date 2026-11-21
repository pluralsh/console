package fakeacp

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/acp"
)

// OpenCodeEnv is the address the fake serves an OpenCode-style /global/event stream on; the stream requires
// basic auth as opencode:$OPENCODE_SERVER_PASSWORD.
const OpenCodeEnv = "FAKE_OPENCODE_ADDR"

// OpenCodeChild is the child session the opencode-subagent scenario's task spawns.
const OpenCodeChild = "ses_child"

// openCodeServer plays the server `opencode acp` runs: its event stream names task subagents' child sessions, and
// like the adapter, the fake streams a child only once the client has opened it.
type openCodeServer struct {
	mu     sync.Mutex
	events chan []byte
	opened map[string]chan struct{}
}

func startOpenCodeServer() *openCodeServer {
	addr := os.Getenv(OpenCodeEnv)
	if addr == "" {
		return nil
	}
	s := &openCodeServer{events: make(chan []byte, 16), opened: map[string]chan struct{}{}}
	l, err := net.Listen("tcp", addr)
	if err != nil {
		return nil
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/global/event", s.serveEvents)
	go func() { _ = (&http.Server{Handler: mux, ReadHeaderTimeout: time.Second}).Serve(l) }()
	return s
}

func (s *openCodeServer) serveEvents(w http.ResponseWriter, r *http.Request) {
	if user, pass, ok := r.BasicAuth(); !ok || user != "opencode" || pass != os.Getenv("OPENCODE_SERVER_PASSWORD") {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	flusher, _ := w.(http.Flusher)
	write := func(data []byte) {
		_, _ = fmt.Fprintf(w, "data: %s\n\n", data)
		if flusher != nil {
			flusher.Flush()
		}
	}
	write([]byte(`{"payload":{"type":"server.connected","properties":{}}}`))
	for {
		select {
		case <-r.Context().Done():
			return
		case data := <-s.events:
			write(data)
		}
	}
}

// expect returns a channel closed once the client opens the session.
func (s *openCodeServer) expect(sid string) <-chan struct{} {
	s.mu.Lock()
	defer s.mu.Unlock()
	ch := make(chan struct{})
	s.opened[sid] = ch
	return ch
}

func (s *openCodeServer) open(sid string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if ch, ok := s.opened[sid]; ok {
		close(ch)
		delete(s.opened, sid)
	}
}

// openCodeSubagent runs a task tool call whose child session streams (and asks for permission) only after the
// client opens it, then completes the task and echoes the permission outcome.
func (f *fakeAgent) openCodeSubagent(sid string, msg func(string)) *acp.RequestError {
	if f.opencode == nil {
		msg("no opencode server")
		return nil
	}
	opened := f.opencode.expect(OpenCodeChild)
	input := map[string]any{"description": "Explore the repo", "prompt": "Find the entrypoints", "subagent_type": "explore"}
	f.update(sid, map[string]any{"sessionUpdate": "tool_call", "toolCallId": "call-task", "title": "task", "kind": "think", "status": "pending", "rawInput": input})
	part, _ := json.Marshal(map[string]any{"directory": "/tmp", "payload": map[string]any{"type": "message.part.updated", "properties": map[string]any{
		"sessionID": sid,
		"part": map[string]any{"type": "tool", "tool": "task", "callID": "call-task", "sessionID": sid, "state": map[string]any{
			"status": "running", "title": "Explore the repo", "input": input,
			"metadata": map[string]any{"sessionId": OpenCodeChild, "parentSessionId": sid},
		}},
	}}})
	f.opencode.events <- part
	select {
	case <-opened:
	case <-time.After(5 * time.Second):
		msg("child never opened")
		return nil
	}
	f.update(OpenCodeChild, map[string]any{"sessionUpdate": "agent_message_chunk", "content": map[string]any{"type": "text", "text": "child says hi"}})
	f.update(OpenCodeChild, map[string]any{"sessionUpdate": "tool_call", "toolCallId": "tc-child", "title": "bash", "kind": "execute",
		"status": "pending", "rawInput": map[string]any{"command": "ls -la"}})
	res, err := f.conn.Call(context.Background(), acp.MethodRequestPermission, map[string]any{
		"sessionId": OpenCodeChild,
		"toolCall":  map[string]any{"toolCallId": "tc-child", "title": "bash"},
		"options":   []any{map[string]any{"optionId": "once", "name": "Allow once", "kind": "allow_once"}},
	})
	if err != nil {
		return &acp.RequestError{Code: -32603, Message: err.Error()}
	}
	out := acp.Obj(acp.RawObject(res), "outcome")
	f.update(OpenCodeChild, map[string]any{"sessionUpdate": "tool_call_update", "toolCallId": "tc-child", "status": "completed"})
	f.update(sid, map[string]any{"sessionUpdate": "tool_call_update", "toolCallId": "call-task", "status": "completed",
		"rawOutput": map[string]any{"output": "done", "metadata": map[string]any{"sessionId": OpenCodeChild}}})
	msg(fmt.Sprintf("outcome:%s:%s", acp.Str(out, "outcome"), acp.Str(out, "optionId")))
	return nil
}
