// Package acp is the daemon's ACP client layer: a raw JSON-RPC connection to a harness over stdio, converters
// between ACP JSON and the devbox.v1 protos, the v1 -> v2 entity normalizer, subagent lineage extraction and the
// live entity store.
//
// It deliberately works on raw JSON (json.RawMessage / map[string]any decoded with UseNumber) instead of the
// typed acp-go-sdk structs, so nothing the agent sends is flattened or dropped (section 4.6a item 5). The SDK's
// Connection is used only as the JSON-RPC transport.
package acp

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"

	acpsdk "github.com/coder/acp-go-sdk"
)

// ACP method names used by the daemon. The v1 methods match acp-go-sdk's constants; session/set_model and
// session/fork are the pre-config-option and unstable variants some v1 adapters still serve.
const (
	MethodInitialize        = "initialize"
	MethodAuthenticate      = "authenticate"
	MethodSessionNew        = "session/new"
	MethodSessionLoad       = "session/load"
	MethodSessionResume     = "session/resume"
	MethodSessionList       = "session/list"
	MethodSessionClose      = "session/close"
	MethodSessionDelete     = "session/delete"
	MethodSessionFork       = "session/fork"
	MethodSessionPrompt     = "session/prompt"
	MethodSessionCancel     = "session/cancel"
	MethodSetConfigOption   = "session/set_config_option"
	MethodSetModel          = "session/set_model"
	MethodSetMode           = "session/set_mode"
	MethodSessionUpdate     = "session/update"
	MethodRequestPermission = "session/request_permission"
	MethodElicitationCreate = "elicitation/create"
	MethodElicitationDone   = "elicitation/complete"
	MethodReadTextFile      = "fs/read_text_file"
	MethodWriteTextFile     = "fs/write_text_file"
	MethodTerminalCreate    = "terminal/create"
	MethodTerminalOutput    = "terminal/output"
	MethodTerminalWait      = "terminal/wait_for_exit"
	MethodTerminalKill      = "terminal/kill"
	MethodTerminalRelease   = "terminal/release"
)

// RequestError is a JSON-RPC error.
type RequestError = acpsdk.RequestError

// Handler serves agent -> client calls. Notifications are delivered one at a time in arrival order; requests run
// concurrently and may block (permission prompts wait for a human).
type Handler interface {
	HandleNotification(ctx context.Context, method string, params json.RawMessage)
	HandleRequest(ctx context.Context, method string, params json.RawMessage) (any, *RequestError)
}

// notificationMethods are agent -> client methods that never carry a JSON-RPC id. acp-go-sdk hands requests and
// notifications to the same callback, so the daemon routes on the method name.
var notificationMethods = map[string]bool{
	MethodSessionUpdate:   true,
	MethodElicitationDone: true,
}

// Conn is one JSON-RPC connection to a harness process.
type Conn struct {
	c     *acpsdk.Connection
	order *inboundOrder
}

// NewConn starts serving JSON-RPC over the harness's stdin (w) and stdout (r).
func NewConn(w io.Writer, r io.Reader, h Handler, log *slog.Logger) *Conn {
	order := newInboundOrder()
	handler := func(ctx context.Context, method string, params json.RawMessage) (any, *acpsdk.RequestError) {
		if notificationMethods[method] {
			defer order.handledOne()
			h.HandleNotification(ctx, method, params)
			return nil, nil
		}
		if orderedRequests[method] {
			order.catchUp(ctx)
		}
		return h.HandleRequest(ctx, method, params)
	}
	c := acpsdk.NewConnection(handler, w, &orderedReader{r: r, o: order})
	if log != nil {
		c.SetLogger(log)
	}
	return &Conn{c: c, order: order}
}

// Call sends a request and returns the raw result.
func (c *Conn) Call(ctx context.Context, method string, params any) (json.RawMessage, error) {
	res, err := acpsdk.SendRequest[json.RawMessage](c.c, ctx, method, params)
	if orderedResponses[method] {
		c.order.catchUp(ctx)
	}
	if err != nil {
		return nil, err
	}
	return res, nil
}

// Notify sends a notification.
func (c *Conn) Notify(ctx context.Context, method string, params any) error {
	return c.c.SendNotification(ctx, method, params)
}

// Done is closed when the peer disconnects.
func (c *Conn) Done() <-chan struct{} { return c.c.Done() }

// AsRequestError extracts a JSON-RPC error.
func AsRequestError(err error) (*RequestError, bool) {
	var re *RequestError
	if errors.As(err, &re) {
		return re, true
	}
	return nil, false
}

// IsMethodNotFound reports a JSON-RPC -32601.
func IsMethodNotFound(err error) bool {
	re, ok := AsRequestError(err)
	return ok && re.Code == -32601
}

// Object is a decoded JSON object with numbers kept as json.Number, so re-encoding is lossless.
type Object = map[string]any

// DecodeObject decodes raw JSON into an Object.
func DecodeObject(raw []byte) (Object, error) {
	var out Object
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	if err := dec.Decode(&out); err != nil {
		return nil, err
	}
	if out == nil {
		out = Object{}
	}
	return out, nil
}

// Decode decodes raw JSON into any value with numbers kept as json.Number.
func Decode(raw []byte) (any, error) {
	var out any
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	err := dec.Decode(&out)
	return out, err
}

// MustJSON encodes v, which must be JSON-encodable.
func MustJSON(v any) []byte {
	b, err := json.Marshal(v)
	if err != nil {
		panic(err)
	}
	return b
}

// Str returns o[k] as a string, or "".
func Str(o Object, k string) string {
	s, _ := o[k].(string)
	return s
}

// Obj returns o[k] as an object, or nil.
func Obj(o Object, k string) Object {
	m, _ := o[k].(map[string]any)
	return m
}

// Arr returns o[k] as an array, or nil.
func Arr(o Object, k string) []any {
	a, _ := o[k].([]any)
	return a
}

// Bool returns o[k] as a bool.
func Bool(o Object, k string) bool {
	b, _ := o[k].(bool)
	return b
}

// Int returns o[k] as an int64.
func Int(o Object, k string) (int64, bool) {
	switch v := o[k].(type) {
	case json.Number:
		i, err := v.Int64()
		if err != nil {
			f, ferr := v.Float64()
			if ferr != nil {
				return 0, false
			}
			return int64(f), true
		}
		return i, true
	case float64:
		return int64(v), true
	case int:
		return int64(v), true
	case int64:
		return v, true
	case int32:
		return int64(v), true
	}
	return 0, false
}

// Float returns o[k] as a float64.
func Float(o Object, k string) (float64, bool) {
	switch v := o[k].(type) {
	case json.Number:
		f, err := v.Float64()
		return f, err == nil
	case float64:
		return v, true
	case int:
		return float64(v), true
	case int64:
		return float64(v), true
	}
	return 0, false
}

// Has reports whether k is present (even when null).
func Has(o Object, k string) bool {
	_, ok := o[k]
	return ok
}
