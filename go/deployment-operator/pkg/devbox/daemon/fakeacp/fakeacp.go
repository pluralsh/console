// Package fakeacp is a scripted ACP v1 agent for tests. A test binary re-executes itself with EnvVar=1 and calls
// Main from TestMain; the agent then speaks ACP over stdio, logs every request it receives to $LogEnv (one JSON
// object per line), and scripts each turn from the prompt's first text block:
//
//	slow:<ms>   sleep, tracking concurrent turns (logged as {"method":"_active","n":N})
//	block       wait for session/cancel, then stop with "cancelled"
//	permission  ask session/request_permission and echo the outcome
//	subagent    a Task tool call and a child update tagged with claude-agent-acp's parentToolUseId
//	subagent-permission  a subagent's tool call, then a permission request for it on the parent session
//	native-subagent  claude-agent-acp's native subagent session: subagent_spawned, the child's own updates and a
//	            permission request on the child's session ID, then subagent_state_update
//	opencode-subagent  an OpenCode task: the child session is named only on the $OpenCodeEnv event stream and
//	            streams (and asks for permission) once the client opens it with session/resume
//	replay:<path>  send each session update in a JSON array file, as captured from a real adapter, on the prompted
//	            session, or on another as {"sessionId": ..., "update": ...}
//	unknown     an unknown content block and an unknown session update kind
//	authfail    fail the turn with -32000 "Authentication required"
//	mode:<id>   switch the session's mode itself (current_mode_update), like leaving plan mode
//	anything    echo it back as "echo:<text>"
//
// Like a Claude model without Auto support, the "smart" model answers the auto mode with acceptEdits.
package fakeacp

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/acp"
)

const (
	fastModel = "fast"
	// noAutoModel answers autoMode with autoFallback, like claude-agent-acp on models without Auto support.
	noAutoModel  = "smart"
	autoMode     = "auto"
	autoFallback = "acceptEdits"
	// EnvVar makes a re-executed test binary run the fake agent.
	EnvVar = "DEVBOX_FAKE_ACP"
	// LogEnv is the request log path.
	LogEnv = "FAKE_ACP_LOG"
)

// Enabled reports whether this process should be the fake agent.
func Enabled() bool { return os.Getenv(EnvVar) == "1" }

// Main runs the fake agent until stdin closes.
func Main() {
	f := &fakeAgent{models: map[string]string{}, modes: map[string]string{}, cancels: map[string]context.CancelFunc{}}
	if p := os.Getenv(LogEnv); p != "" {
		f.log, _ = os.OpenFile(p, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o600)
	}
	f.opencode = startOpenCodeServer()
	f.conn = acp.NewConn(os.Stdout, os.Stdin, f, nil)
	<-f.conn.Done()
}

type fakeAgent struct {
	conn     *acp.Conn
	opencode *openCodeServer

	mu       sync.Mutex
	n        int
	models   map[string]string
	modes    map[string]string
	cancels  map[string]context.CancelFunc
	active   int
	logMu    sync.Mutex
	log      *os.File
	sessions []string
}

func (f *fakeAgent) record(method string, params any) {
	if f.log == nil {
		return
	}
	f.logMu.Lock()
	defer f.logMu.Unlock()
	data, _ := json.Marshal(map[string]any{"method": method, "params": params})
	_, _ = f.log.Write(append(data, '\n'))
}

func (f *fakeAgent) HandleNotification(context.Context, string, json.RawMessage) {}

func (f *fakeAgent) modelOptions(current string) []any {
	return []any{map[string]any{
		"id": "model", "name": "Model", "category": "model", "type": "select", "currentValue": current,
		"options": []any{
			map[string]any{"value": "fast", "name": "Fast"},
			map[string]any{"value": "smart", "name": "Smart"},
		},
	}}
}

// modes mirrors claude-agent-acp's v1 session modes.
func modes(current string) map[string]any {
	ids := []string{"default", "acceptEdits", "plan", "auto", "bypassPermissions"}
	avail := make([]any, 0, len(ids))
	for _, id := range ids {
		avail = append(avail, map[string]any{"id": id, "name": id})
	}
	return map[string]any{"currentModeId": current, "availableModes": avail}
}

// nativeHistorySuffix marks (next to the request log, so it outlives the process) the session that ran the
// native-subagent scenario.
const nativeHistorySuffix = ".native"

// replayNativeHistory replays a native-subagent session's history the way codex-acp does on session/load: each
// child is re-announced and its own history streamed onto its session, including children the client never saw.
func (f *fakeAgent) replayNativeHistory(sid string) {
	p := os.Getenv(LogEnv)
	if b, err := os.ReadFile(p + nativeHistorySuffix); p == "" || err != nil || string(b) != sid {
		return
	}
	for _, child := range []string{"task-native", "task-unseen"} {
		f.update(sid, map[string]any{"sessionUpdate": "subagent_spawned", "subagentSessionId": child, "name": child,
			"task": "Delegated task for " + child, "capabilities": map[string]any{}})
		f.update(child, map[string]any{"sessionUpdate": "agent_message_chunk", "content": map[string]any{"type": "text", "text": "child says hi"}})
		f.update(sid, map[string]any{"sessionUpdate": "subagent_state_update", "subagentSessionId": child, "state": "completed"})
	}
}

func (f *fakeAgent) update(sid string, u map[string]any) {
	_ = f.conn.Notify(context.Background(), acp.MethodSessionUpdate, map[string]any{"sessionId": sid, "update": u})
}

func (f *fakeAgent) HandleRequest(ctx context.Context, method string, raw json.RawMessage) (any, *acp.RequestError) {
	params := acp.RawObject(raw)
	f.record(method, params)
	sid := acp.Str(params, "sessionId")
	switch method {
	case acp.MethodInitialize:
		return map[string]any{
			"protocolVersion": 1,
			"agentCapabilities": map[string]any{
				"loadSession":         true,
				"sessionCapabilities": map[string]any{"list": map[string]any{}, "resume": map[string]any{}, "close": map[string]any{}, "delete": map[string]any{}, "fork": map[string]any{}},
				"mcpCapabilities":     map[string]any{"http": true},
				"promptCapabilities":  map[string]any{"image": true, "embeddedContext": true},
			},
			"agentInfo":   map[string]any{"name": "fake-acp", "version": "1.0.0"},
			"authMethods": []any{},
		}, nil
	case acp.MethodSessionNew, acp.MethodSessionFork:
		f.mu.Lock()
		f.n++
		id := "sess-" + strconv.Itoa(f.n)
		f.models[id] = fastModel
		f.sessions = append(f.sessions, id)
		f.mu.Unlock()
		go func() {
			time.Sleep(50 * time.Millisecond)
			f.update(id, map[string]any{"sessionUpdate": "available_commands_update", "availableCommands": []any{
				map[string]any{"name": "review", "description": "Review the diff", "input": map[string]any{"hint": "focus"}},
			}})
		}()
		return map[string]any{"sessionId": id, "configOptions": f.modelOptions("fast"), "modes": modes("default")}, nil
	case acp.MethodSessionResume, acp.MethodSessionLoad:
		f.mu.Lock()
		cur := f.models[sid]
		f.mu.Unlock()
		if cur == "" {
			cur = fastModel
		}
		f.replayNativeHistory(sid)
		if f.opencode != nil {
			f.opencode.open(sid)
		}
		// Like claude-agent-acp, a reopened session starts in the default mode.
		return map[string]any{"configOptions": f.modelOptions(cur), "modes": modes("default")}, nil
	case acp.MethodSetMode:
		mode := acp.Str(params, "modeId")
		f.mu.Lock()
		if mode == autoMode && f.models[sid] == noAutoModel {
			mode = autoFallback
		}
		f.modes[sid] = mode
		f.mu.Unlock()
		if mode != acp.Str(params, "modeId") {
			f.update(sid, map[string]any{"sessionUpdate": "current_mode_update", "currentModeId": mode})
		}
		return map[string]any{}, nil
	case acp.MethodSessionList:
		f.mu.Lock()
		defer f.mu.Unlock()
		var out []any
		for _, id := range f.sessions {
			out = append(out, map[string]any{"sessionId": id, "cwd": "/tmp", "title": "t " + id})
		}
		out = append(out, map[string]any{"sessionId": "external-1", "cwd": "/tmp", "title": "made in a terminal"})
		return map[string]any{"sessions": out}, nil
	case acp.MethodSessionClose, acp.MethodSessionDelete:
		return map[string]any{}, nil
	case acp.MethodSetConfigOption:
		v := acp.Str(params, "value")
		if v != fastModel && v != "smart" {
			return nil, &acp.RequestError{Code: -32602, Message: "invalid value"}
		}
		f.mu.Lock()
		f.models[sid] = v
		downgrade := v == noAutoModel && f.modes[sid] == autoMode
		if downgrade {
			f.modes[sid] = autoFallback
		}
		f.mu.Unlock()
		if downgrade {
			f.update(sid, map[string]any{"sessionUpdate": "current_mode_update", "currentModeId": autoFallback})
		}
		return map[string]any{"configOptions": f.modelOptions(v)}, nil
	case acp.MethodSessionCancel:
		f.mu.Lock()
		if c := f.cancels[sid]; c != nil {
			c()
		}
		f.mu.Unlock()
		return nil, nil
	case acp.MethodSessionPrompt:
		return f.prompt(sid, params)
	}
	return nil, &acp.RequestError{Code: -32601, Message: "method not found: " + method}
}

func (f *fakeAgent) prompt(sid string, params acp.Object) (any, *acp.RequestError) {
	text := ""
	for _, b := range acp.Arr(params, "prompt") {
		if o, ok := b.(map[string]any); ok && acp.Str(o, "type") == "text" {
			text = acp.Str(o, "text")
			break
		}
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	f.mu.Lock()
	f.cancels[sid] = cancel
	f.active++
	f.record("_active", map[string]any{"n": f.active})
	f.mu.Unlock()
	defer func() {
		f.mu.Lock()
		f.active--
		delete(f.cancels, sid)
		f.mu.Unlock()
	}()
	msg := func(s string) {
		f.update(sid, map[string]any{"sessionUpdate": "agent_message_chunk", "content": map[string]any{"type": "text", "text": s}})
	}
	done := map[string]any{"stopReason": "end_turn", "usage": map[string]any{"inputTokens": 10, "outputTokens": 5, "totalTokens": 15}}

	switch {
	case strings.HasPrefix(text, "slow:"):
		ms, _ := strconv.Atoi(strings.TrimPrefix(text, "slow:"))
		select {
		case <-time.After(time.Duration(ms) * time.Millisecond):
		case <-ctx.Done():
			return map[string]any{"stopReason": "cancelled"}, nil
		}
		msg("slept " + strconv.Itoa(ms))
	case text == "block":
		<-ctx.Done()
		return map[string]any{"stopReason": "cancelled"}, nil
	case text == "permission":
		res, err := f.conn.Call(context.Background(), acp.MethodRequestPermission, map[string]any{
			"sessionId": sid,
			"toolCall":  map[string]any{"toolCallId": "tc-perm", "title": "rm -rf build", "kind": "execute", "status": "pending"},
			"options": []any{
				map[string]any{"optionId": "allow", "name": "Allow once", "kind": "allow_once"},
				map[string]any{"optionId": "reject", "name": "Reject", "kind": "reject_once"},
			},
		})
		if err != nil {
			return nil, &acp.RequestError{Code: -32603, Message: err.Error()}
		}
		out := acp.Obj(acp.RawObject(res), "outcome")
		msg(fmt.Sprintf("outcome:%s:%s", acp.Str(out, "outcome"), acp.Str(out, "optionId")))
	case text == "subagent":
		f.update(sid, map[string]any{"sessionUpdate": "tool_call", "toolCallId": "task-1", "title": "Explore the repo",
			"kind": "think", "status": "in_progress", "_meta": map[string]any{"claudeCode": map[string]any{"toolName": "Task"}}})
		f.update(sid, map[string]any{"sessionUpdate": "agent_message_chunk", "content": map[string]any{"type": "text", "text": "child says hi"},
			"_meta": map[string]any{"claudeCode": map[string]any{"parentToolUseId": "task-1"}}})
		f.update(sid, map[string]any{"sessionUpdate": "tool_call_update", "toolCallId": "task-1", "status": "completed"})
		msg("parent done")
	case text == "subagent-permission":
		child := map[string]any{"claudeCode": map[string]any{"parentToolUseId": "task-1"}}
		f.update(sid, map[string]any{"sessionUpdate": "tool_call", "toolCallId": "task-1", "title": "Explore the repo",
			"kind": "think", "status": "in_progress"})
		f.update(sid, map[string]any{"sessionUpdate": "tool_call", "toolCallId": "tc-child", "title": "rm -rf build",
			"kind": "execute", "status": "pending", "_meta": child})
		// like claude-agent-acp, the request names the parent session and carries no lineage
		res, err := f.conn.Call(context.Background(), acp.MethodRequestPermission, map[string]any{
			"sessionId": sid,
			"toolCall":  map[string]any{"toolCallId": "tc-child", "title": "rm -rf build"},
			"options":   []any{map[string]any{"optionId": "allow", "name": "Allow once", "kind": "allow_once"}},
		})
		if err != nil {
			return nil, &acp.RequestError{Code: -32603, Message: err.Error()}
		}
		out := acp.Obj(acp.RawObject(res), "outcome")
		msg(fmt.Sprintf("outcome:%s:%s", acp.Str(out, "outcome"), acp.Str(out, "optionId")))
	case text == "native-subagent":
		const child = "task-native"
		// the adapter still stamps the spawning Agent call on routed updates
		lineage := map[string]any{"claudeCode": map[string]any{"parentToolUseId": "toolu-agent"}}
		f.update(sid, map[string]any{"sessionUpdate": "subagent_spawned", "subagentSessionId": child, "name": "Explore the repo",
			"task": "Find the entrypoints", "capabilities": map[string]any{}})
		f.update(child, map[string]any{"sessionUpdate": "agent_message_chunk", "content": map[string]any{"type": "text", "text": "child says hi"}, "_meta": lineage})
		f.update(child, map[string]any{"sessionUpdate": "tool_call", "toolCallId": "tc-child", "title": "Bash", "kind": "execute",
			"status": "pending", "rawInput": map[string]any{"command": "ls -la"}, "_meta": lineage})
		// the request's tool call is a delta: the command came with the tool_call above
		res, err := f.conn.Call(context.Background(), acp.MethodRequestPermission, map[string]any{
			"sessionId": child,
			"toolCall":  map[string]any{"toolCallId": "tc-child", "title": "Bash"},
			"options":   []any{map[string]any{"optionId": "allow", "name": "Allow once", "kind": "allow_once"}},
		})
		if err != nil {
			return nil, &acp.RequestError{Code: -32603, Message: err.Error()}
		}
		out := acp.Obj(acp.RawObject(res), "outcome")
		f.update(child, map[string]any{"sessionUpdate": "tool_call_update", "toolCallId": "tc-child", "status": "completed", "_meta": lineage})
		f.update(sid, map[string]any{"sessionUpdate": "subagent_state_update", "subagentSessionId": child, "state": "completed"})
		msg(fmt.Sprintf("outcome:%s:%s", acp.Str(out, "outcome"), acp.Str(out, "optionId")))
		if p := os.Getenv(LogEnv); p != "" {
			_ = os.WriteFile(p+nativeHistorySuffix, []byte(sid), 0o600)
		}
	case strings.HasPrefix(text, "replay:"):
		data, err := os.ReadFile(strings.TrimPrefix(text, "replay:"))
		var updates []map[string]any
		if err == nil {
			err = json.Unmarshal(data, &updates)
		}
		if err != nil {
			return nil, &acp.RequestError{Code: -32603, Message: err.Error()}
		}
		for _, u := range updates {
			if child, ok := u["sessionId"].(string); ok {
				f.update(child, u["update"].(map[string]any))
				continue
			}
			f.update(sid, u)
		}
		msg("replayed")
	case text == "opencode-subagent":
		if err := f.openCodeSubagent(sid, msg); err != nil {
			return nil, err
		}
	case text == "unknown":
		f.update(sid, map[string]any{"sessionUpdate": "agent_message_chunk", "content": map[string]any{"type": "hologram", "shape": "cube", "size": 3}})
		f.update(sid, map[string]any{"sessionUpdate": "future_widget", "widgetId": "w1", "payload": map[string]any{"a": 1, "nested": []any{"x"}}})
	case strings.HasPrefix(text, "mode:"):
		f.mu.Lock()
		f.modes[sid] = strings.TrimPrefix(text, "mode:")
		f.mu.Unlock()
		f.update(sid, map[string]any{"sessionUpdate": "current_mode_update", "currentModeId": strings.TrimPrefix(text, "mode:")})
		msg("mode changed")
	case text == "authfail":
		return nil, &acp.RequestError{Code: -32000, Message: "Authentication required"}
	default:
		msg("echo:" + text)
	}
	return done, nil
}
