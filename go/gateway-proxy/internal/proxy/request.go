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

type RequestOptions struct {
	ResolveModel      func(string) string
	StripCacheControl bool
	BetaAllowlist     []string
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

	betas, err := mergeBetas(fields["anthropic_beta"], header.Values("anthropic-beta"), opts.BetaAllowlist)
	if err != nil {
		return nil, err
	}
	if len(betas) > 0 {
		fields["anthropic_beta"] = mustMarshal(betas)
	} else {
		delete(fields, "anthropic_beta")
	}

	if opts.StripCacheControl {
		for _, key := range []string{"system", "messages", "tools"} {
			if raw, ok := fields[key]; ok {
				fields[key] = stripCacheControl(raw)
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

func mergeBetas(bodyBetas json.RawMessage, headerValues []string, allowlist []string) ([]string, *APIError) {
	var betas []string
	if len(bodyBetas) > 0 && !isNull(bodyBetas) {
		if err := json.Unmarshal(bodyBetas, &betas); err != nil {
			return nil, invalidRequest("anthropic_beta: must be an array of strings")
		}
	}
	for _, value := range headerValues {
		for _, beta := range strings.Split(value, ",") {
			betas = append(betas, strings.TrimSpace(beta))
		}
	}

	out := make([]string, 0, len(betas))
	for _, beta := range betas {
		if beta == "" || slices.Contains(out, beta) {
			continue
		}
		if len(allowlist) > 0 && !slices.Contains(allowlist, beta) {
			continue
		}
		out = append(out, beta)
	}
	return out, nil
}

// stripCacheControl removes every cache_control key from a JSON value. Values that are not
// objects or arrays are returned untouched.
func stripCacheControl(raw json.RawMessage) json.RawMessage {
	var v any
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	if err := dec.Decode(&v); err != nil {
		return raw
	}
	out, err := json.Marshal(removeKey(v, "cache_control"))
	if err != nil {
		return raw
	}
	return out
}

func removeKey(v any, key string) any {
	switch t := v.(type) {
	case map[string]any:
		delete(t, key)
		for k, child := range t {
			t[k] = removeKey(child, key)
		}
		return t
	case []any:
		for i, child := range t {
			t[i] = removeKey(child, key)
		}
		return t
	default:
		return v
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
