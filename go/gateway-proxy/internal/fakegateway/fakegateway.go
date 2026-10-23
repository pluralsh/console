// Package fakegateway is an in-memory FM gateway for tests: an OAuth2 client-credentials token
// endpoint plus the Bedrock invoke and invoke-with-response-stream endpoints from gateway.yaml.
package fakegateway

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws/protocol/eventstream"
)

const (
	ClientID     = "proxy-client"
	ClientSecret = "proxy-secret"
)

// allowedFields mirrors BedrockClaudeMessagesRequestBody; the real gateway rejects anything else.
var allowedFields = map[string]bool{
	"anthropic_version": true, "anthropic_beta": true, "max_tokens": true, "system": true,
	"messages": true, "metadata": true, "temperature": true, "thinking": true, "top_p": true,
	"top_k": true, "tools": true, "tool_choice": true, "stop_sequences": true,
}

// Request is an invoke call as received by the fake gateway.
type Request struct {
	ModelID string
	Stream  bool
	Header  http.Header
	Body    map[string]any
}

// Reply is what the fake gateway answers with. A non-zero Status produces a gateway error body.
type Reply struct {
	Status  int
	Message string
	Header  http.Header
	// Response is a BedrockClaudeMessagesResponse.
	Response map[string]any
	// Delay holds the response back, to exercise keepalives and timeouts.
	Delay time.Duration
}

type Responder func(Request) Reply

type Server struct {
	*httptest.Server

	// Responder decides the reply to each invoke call; defaults to EchoResponder.
	Responder Responder
	// TokenTTL is the expires_in advertised for issued tokens.
	TokenTTL time.Duration

	tokenCalls atomic.Int64
	mu         sync.Mutex
	tokens     map[string]bool
	requests   []Request
}

func New() *Server {
	s := &Server{Responder: EchoResponder, TokenTTL: time.Hour, tokens: map[string]bool{}}
	mux := http.NewServeMux()
	mux.HandleFunc("POST /oauth/token", s.token)
	mux.HandleFunc("POST /model/{model}/invoke", s.invoke(false))
	mux.HandleFunc("POST /model/{model}/invoke-with-response-stream", s.invoke(true))
	s.Server = httptest.NewServer(mux)
	return s
}

func (s *Server) TokenURL() string { return s.URL + "/oauth/token" }

func (s *Server) TokenCalls() int { return int(s.tokenCalls.Load()) }

// RevokeTokens invalidates every issued token, as if the identity provider rotated keys.
func (s *Server) RevokeTokens() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.tokens = map[string]bool{}
}

func (s *Server) Requests() []Request {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]Request(nil), s.requests...)
}

func (s *Server) token(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "bad form", http.StatusBadRequest)
		return
	}
	id, secret, ok := r.BasicAuth()
	if !ok {
		id, secret = r.PostForm.Get("client_id"), r.PostForm.Get("client_secret")
	}
	if r.PostForm.Get("grant_type") != "client_credentials" || id != ClientID || secret != ClientSecret {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"error":"invalid_client"}`))
		return
	}

	n := s.tokenCalls.Add(1)
	tok := fmt.Sprintf("token-%d", n)
	s.mu.Lock()
	s.tokens[tok] = true
	s.mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"access_token": tok,
		"token_type":   "Bearer",
		"expires_in":   int(s.TokenTTL.Seconds()),
	})
}

func (s *Server) invoke(stream bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		auth := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		s.mu.Lock()
		valid := s.tokens[auth]
		s.mu.Unlock()
		if !valid {
			writeGatewayError(w, http.StatusUnauthorized, "invalid or expired token")
			return
		}

		var body map[string]any
		dec := json.NewDecoder(r.Body)
		dec.UseNumber()
		if err := dec.Decode(&body); err != nil {
			writeGatewayError(w, http.StatusBadRequest, "Error reading request body: "+err.Error())
			return
		}
		for key := range body {
			if !allowedFields[key] {
				writeGatewayError(w, http.StatusBadRequest, fmt.Sprintf("Error reading request body: json: unknown field %q", key))
				return
			}
		}
		if body["anthropic_version"] != "bedrock-2023-05-31" {
			writeGatewayError(w, http.StatusBadRequest, "anthropic_version must be bedrock-2023-05-31")
			return
		}
		if body["max_tokens"] == nil || body["messages"] == nil {
			writeGatewayError(w, http.StatusBadRequest, "max_tokens and messages are required")
			return
		}

		req := Request{ModelID: r.PathValue("model"), Stream: stream, Header: r.Header.Clone(), Body: body}
		s.mu.Lock()
		s.requests = append(s.requests, req)
		s.mu.Unlock()

		reply := s.Responder(req)
		if reply.Delay > 0 {
			select {
			case <-time.After(reply.Delay):
			case <-r.Context().Done():
				return
			}
		}
		for k, vs := range reply.Header {
			for _, v := range vs {
				w.Header().Add(k, v)
			}
		}
		if reply.Status != 0 && reply.Status != http.StatusOK {
			writeGatewayError(w, reply.Status, reply.Message)
			return
		}

		resp := map[string]any{"model": req.ModelID}
		for k, v := range reply.Response {
			resp[k] = v
		}
		if !stream {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(resp)
			return
		}
		writeEventStream(w, resp)
	}
}

func writeGatewayError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"error": map[string]any{"code": status, "message": msg, "request_id": "fake/req-1"},
	})
}

// writeEventStream emits the response as Bedrock InvokeModelWithResponseStream chunks, splitting
// text into several deltas and appending invocation metrics like Bedrock does.
func writeEventStream(w http.ResponseWriter, resp map[string]any) {
	w.Header().Set("Content-Type", "application/vnd.amazon.eventstream")
	w.WriteHeader(http.StatusOK)
	flusher, _ := w.(http.Flusher)
	enc := eventstream.NewEncoder()

	send := func(event map[string]any) {
		payload, _ := json.Marshal(event)
		chunk, _ := json.Marshal(map[string][]byte{"bytes": payload})
		msg := eventstream.Message{Payload: chunk}
		msg.Headers.Set(":message-type", eventstream.StringValue("event"))
		msg.Headers.Set(":event-type", eventstream.StringValue("chunk"))
		msg.Headers.Set(":content-type", eventstream.StringValue("application/json"))
		var buf bytes.Buffer
		_ = enc.Encode(&buf, msg)
		_, _ = w.Write(buf.Bytes())
		if flusher != nil {
			flusher.Flush()
		}
	}

	start := map[string]any{}
	for k, v := range resp {
		start[k] = v
	}
	start["content"] = []any{}
	start["stop_reason"] = nil
	send(map[string]any{"type": "message_start", "message": start})

	content, _ := resp["content"].([]any)
	for i, raw := range content {
		block, _ := raw.(map[string]any)
		switch block["type"] {
		case "text":
			send(map[string]any{"type": "content_block_start", "index": i, "content_block": map[string]any{"type": "text", "text": ""}})
			for _, piece := range splitText(block["text"].(string)) {
				send(map[string]any{"type": "content_block_delta", "index": i, "delta": map[string]any{"type": "text_delta", "text": piece}})
			}
		case "tool_use":
			send(map[string]any{"type": "content_block_start", "index": i, "content_block": map[string]any{
				"type": "tool_use", "id": block["id"], "name": block["name"], "input": map[string]any{},
			}})
			input, _ := json.Marshal(block["input"])
			half := len(input) / 2
			for _, part := range []string{string(input[:half]), string(input[half:])} {
				send(map[string]any{"type": "content_block_delta", "index": i, "delta": map[string]any{"type": "input_json_delta", "partial_json": part}})
			}
		default:
			send(map[string]any{"type": "content_block_start", "index": i, "content_block": block})
		}
		send(map[string]any{"type": "content_block_stop", "index": i})
	}

	usage, _ := resp["usage"].(map[string]any)
	send(map[string]any{
		"type":  "message_delta",
		"delta": map[string]any{"stop_reason": resp["stop_reason"], "stop_sequence": nil},
		"usage": map[string]any{"output_tokens": usage["output_tokens"]},
	})
	send(map[string]any{
		"type": "message_stop",
		"amazon-bedrock-invocationMetrics": map[string]any{
			"inputTokenCount": usage["input_tokens"], "outputTokenCount": usage["output_tokens"],
			"invocationLatency": 42, "firstByteLatency": 7,
		},
	})
}

func splitText(text string) []string {
	words := strings.SplitAfter(text, " ")
	if len(words) == 0 {
		return []string{text}
	}
	return words
}

// TextResponse builds a BedrockClaudeMessagesResponse with a single text block.
func TextResponse(text string) map[string]any {
	return map[string]any{
		"id":            "bedrock_01FAKE",
		"type":          "message",
		"role":          "assistant",
		"content":       []any{map[string]any{"type": "text", "text": text}},
		"stop_reason":   "end_turn",
		"stop_sequence": nil,
		"usage":         map[string]any{"input_tokens": 12, "output_tokens": len(strings.Fields(text))},
	}
}

// EchoResponder answers with the text of the last user message, or calls the first declared
// tool when tools are present and the conversation doesn't end with a tool result.
func EchoResponder(req Request) Reply {
	messages, _ := req.Body["messages"].([]any)
	last, _ := messages[len(messages)-1].(map[string]any)

	if tools, ok := req.Body["tools"].([]any); ok && len(tools) > 0 && !hasToolResult(last) {
		tool, _ := tools[0].(map[string]any)
		return Reply{Response: map[string]any{
			"id":   "bedrock_01TOOL",
			"type": "message",
			"role": "assistant",
			"content": []any{
				map[string]any{"type": "text", "text": "Let me check."},
				map[string]any{"type": "tool_use", "id": "toolu_01FAKE", "name": tool["name"], "input": map[string]any{"city": "Paris"}},
			},
			"stop_reason":   "tool_use",
			"stop_sequence": nil,
			"usage":         map[string]any{"input_tokens": 30, "output_tokens": 15},
		}}
	}

	return Reply{Response: TextResponse("echo: " + lastText(last))}
}

func hasToolResult(msg map[string]any) bool {
	blocks, _ := msg["content"].([]any)
	for _, b := range blocks {
		if block, ok := b.(map[string]any); ok && block["type"] == "tool_result" {
			return true
		}
	}
	return false
}

func lastText(msg map[string]any) string {
	switch content := msg["content"].(type) {
	case string:
		return content
	case []any:
		var parts []string
		for _, b := range content {
			block, _ := b.(map[string]any)
			switch block["type"] {
			case "text":
				parts = append(parts, fmt.Sprint(block["text"]))
			case "tool_result":
				parts = append(parts, "tool said "+toolResultText(block["content"]))
			}
		}
		return strings.Join(parts, " ")
	}
	return ""
}

func toolResultText(content any) string {
	switch c := content.(type) {
	case string:
		return c
	case []any:
		var parts []string
		for _, b := range c {
			if block, ok := b.(map[string]any); ok {
				parts = append(parts, fmt.Sprint(block["text"]))
			}
		}
		return strings.Join(parts, " ")
	}
	return ""
}
