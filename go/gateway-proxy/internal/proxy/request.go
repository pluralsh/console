package proxy

import (
	"bytes"
	"encoding/json"
	"net/http"
	"slices"
	"strings"
)

const bedrockAnthropicVersion = "bedrock-2023-05-31"

// gatewayFields are the top-level BedrockClaudeMessagesRequestBody fields the gateway accepts.
// Anything else (model, stream, service_tier, ...) is dropped since the gateway rejects unknown fields.
var gatewayFields = map[string]bool{
	"anthropic_version": true,
	"anthropic_beta":    true,
	"max_tokens":        true,
	"system":            true,
	"messages":          true,
	"metadata":          true,
	"temperature":       true,
	"thinking":          true,
	"top_p":             true,
	"top_k":             true,
	"tools":             true,
	"tool_choice":       true,
	"stop_sequences":    true,
}

// bedrockBetaPrefixes are the anthropic-beta families Bedrock InvokeModel accepts. Clients built
// for the Anthropic API send others (tools-2024-05-16, prompt-caching-2024-07-31,
// files-api-2025-04-14, claude-code-20250219, ...) that Bedrock rejects with a 400, so anything
// outside this list is dropped unless an explicit allowlist is configured.
var bedrockBetaPrefixes = []string{
	"computer-use-",
	"token-efficient-tools-",
	"interleaved-thinking-",
	"output-128k-",
	"dev-full-thinking-",
	"context-1m-",
	"context-management-",
	"effort-",
	"tool-search-tool-",
	"tool-examples-",
	"compact-",
	"fine-grained-tool-streaming-",
}

type RequestOptions struct {
	ResolveModel      func(string) string
	StripCacheControl bool
	// BetaAllowlist, when set, replaces the Bedrock defaults: only exactly matching betas are kept.
	BetaAllowlist []string
}

// PreparedRequest is an Anthropic Messages request rewritten for the gateway invoke endpoint.
type PreparedRequest struct {
	// Model is the model name the client asked for, echoed back in responses.
	Model string
	// ModelID is the gateway model ID used in the invoke path.
	ModelID string
	Stream  bool
	Body    []byte
	// Dropped lists top-level request fields that were not forwarded.
	Dropped []string
	// Betas are the anthropic-beta values forwarded; DroppedBetas were filtered out.
	Betas        []string
	DroppedBetas []string
}

// PrepareRequest converts an Anthropic Messages API request body into a Bedrock invoke body.
func PrepareRequest(body []byte, header http.Header, opts RequestOptions) (*PreparedRequest, *APIError) {
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(body, &fields); err != nil || fields == nil {
		return nil, invalidRequest("request body must be a JSON object")
	}

	out := &PreparedRequest{}
	if raw, ok := fields["model"]; ok {
		if err := json.Unmarshal(raw, &out.Model); err != nil {
			return nil, invalidRequest("model: must be a string")
		}
	}
	if raw, ok := fields["stream"]; ok && !isNull(raw) {
		if err := json.Unmarshal(raw, &out.Stream); err != nil {
			return nil, invalidRequest("stream: must be a boolean")
		}
	}

	out.ModelID = out.Model
	if opts.ResolveModel != nil {
		out.ModelID = opts.ResolveModel(out.Model)
	}
	if out.ModelID == "" {
		return nil, invalidRequest("model: field required")
	}
	if raw, ok := fields["max_tokens"]; !ok || isNull(raw) {
		return nil, invalidRequest("max_tokens: field required")
	}
	if raw, ok := fields["messages"]; !ok || isNull(raw) {
		return nil, invalidRequest("messages: field required")
	}

	for key := range fields {
		if !gatewayFields[key] {
			if key != "model" && key != "stream" {
				out.Dropped = append(out.Dropped, key)
			}
			delete(fields, key)
		}
	}
	slices.Sort(out.Dropped)

	fields["anthropic_version"] = mustMarshal(bedrockAnthropicVersion)

	betas, droppedBetas, err := mergeBetas(fields["anthropic_beta"], header.Values("anthropic-beta"), opts.BetaAllowlist)
	if err != nil {
		return nil, err
	}
	out.Betas, out.DroppedBetas = betas, droppedBetas
	if len(betas) > 0 {
		fields["anthropic_beta"] = mustMarshal(betas)
	} else {
		delete(fields, "anthropic_beta")
	}

	if opts.StripCacheControl {
		for key, strip := range map[string]func(any){
			"system":   stripBlocks,
			"messages": stripMessages,
			"tools":    stripTools,
		} {
			if raw, ok := fields[key]; ok {
				fields[key] = stripCacheControl(raw, strip)
			}
		}
	}

	encoded, mErr := json.Marshal(fields)
	if mErr != nil {
		return nil, invalidRequest("failed to encode gateway request")
	}
	out.Body = encoded
	return out, nil
}

func mergeBetas(bodyBetas json.RawMessage, headerValues []string, allowlist []string) (kept, dropped []string, apiErr *APIError) {
	var betas []string
	if len(bodyBetas) > 0 && !isNull(bodyBetas) {
		if err := json.Unmarshal(bodyBetas, &betas); err != nil {
			return nil, nil, invalidRequest("anthropic_beta: must be an array of strings")
		}
	}
	for _, value := range headerValues {
		for _, beta := range strings.Split(value, ",") {
			betas = append(betas, strings.TrimSpace(beta))
		}
	}

	kept = make([]string, 0, len(betas))
	for _, beta := range betas {
		if beta == "" || slices.Contains(kept, beta) || slices.Contains(dropped, beta) {
			continue
		}
		if !betaAllowed(beta, allowlist) {
			dropped = append(dropped, beta)
			continue
		}
		kept = append(kept, beta)
	}
	return kept, dropped, nil
}

func betaAllowed(beta string, allowlist []string) bool {
	if len(allowlist) > 0 {
		return slices.Contains(allowlist, beta)
	}
	return slices.ContainsFunc(bedrockBetaPrefixes, func(prefix string) bool {
		return strings.HasPrefix(beta, prefix)
	})
}

// stripCacheControl removes cache hints from a system, messages or tools value. Only the
// positions where the Messages API accepts cache_control are touched: tool input schemas and
// tool_use inputs are user data and may legitimately contain a cache_control key.
func stripCacheControl(raw json.RawMessage, strip func(any)) json.RawMessage {
	var v any
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	if err := dec.Decode(&v); err != nil {
		return raw
	}
	strip(v)
	out, err := json.Marshal(v)
	if err != nil {
		return raw
	}
	return out
}

// stripBlocks handles a list of content blocks (system, or a message's content).
func stripBlocks(v any) {
	blocks, _ := v.([]any)
	for _, b := range blocks {
		block, ok := b.(map[string]any)
		if !ok {
			continue
		}
		delete(block, "cache_control")
		if block["type"] == "tool_result" {
			stripBlocks(block["content"])
		}
	}
}

func stripMessages(v any) {
	messages, _ := v.([]any)
	for _, m := range messages {
		if msg, ok := m.(map[string]any); ok {
			stripBlocks(msg["content"])
		}
	}
}

func stripTools(v any) {
	tools, _ := v.([]any)
	for _, t := range tools {
		if tool, ok := t.(map[string]any); ok {
			delete(tool, "cache_control")
		}
	}
}

func isNull(raw json.RawMessage) bool {
	return string(bytes.TrimSpace(raw)) == "null"
}

func mustMarshal(v any) json.RawMessage {
	b, err := json.Marshal(v)
	if err != nil {
		panic(err)
	}
	return b
}
