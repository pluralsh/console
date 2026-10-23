package proxy

import (
	"encoding/json"
	"fmt"
)

// Message is an Anthropic Messages API response. Content blocks and usage stay raw so block
// types and usage fields the proxy doesn't know about are forwarded unchanged.
type Message struct {
	ID           string            `json:"id"`
	Type         string            `json:"type"`
	Role         string            `json:"role"`
	Model        string            `json:"model"`
	Content      []json.RawMessage `json:"content"`
	StopReason   *string           `json:"stop_reason"`
	StopSequence *string           `json:"stop_sequence"`
	Usage        json.RawMessage   `json:"usage"`
}

var emptyUsage = json.RawMessage(`{"input_tokens":0,"output_tokens":0}`)

// ParseGatewayResponse decodes a BedrockClaudeMessagesResponse and normalizes it into an
// Anthropic message, reporting the client's requested model name when one was given.
func ParseGatewayResponse(body []byte, model string) (*Message, error) {
	var msg Message
	if err := json.Unmarshal(body, &msg); err != nil {
		return nil, fmt.Errorf("invalid gateway response: %w", err)
	}
	if msg.ID == "" {
		return nil, fmt.Errorf("invalid gateway response: missing id")
	}

	msg.Type = "message"
	msg.Role = "assistant"
	if model != "" {
		msg.Model = model
	}
	if msg.Content == nil {
		msg.Content = []json.RawMessage{}
	}
	if len(msg.Usage) == 0 || isNull(msg.Usage) {
		msg.Usage = emptyUsage
	}
	return &msg, nil
}
