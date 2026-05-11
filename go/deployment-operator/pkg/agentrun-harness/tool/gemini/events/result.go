package events

import (
	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
)

type StreamStats struct {
	TotalTokens  int `json:"total_tokens"`
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
	DurationMs   int `json:"duration_ms"`
	ToolCalls    int `json:"tool_calls"`
}

func (s *StreamStats) Attributes() *console.AgentMessageCostAttributes {
	if s == nil {
		return nil
	}

	return &console.AgentMessageCostAttributes{
		Total: float64(s.TotalTokens),
		Tokens: &console.AgentMessageTokensAttributes{
			Input:  lo.ToPtr(float64(s.InputTokens)),
			Output: lo.ToPtr(float64(s.OutputTokens)),
		},
	}
}

type Status string

const (
	StatusSuccess Status = "success"
	StatusError   Status = "error"
)

type ResultEvent struct {
	EventBase
	Status Status       `json:"status"`
	Error  *ResultError `json:"error,omitempty"`
	Stats  *StreamStats `json:"stats,omitempty"`
}

func (e *ResultEvent) Validate() bool {
	return e.Type == EventTypeResult
}

func (e *ResultEvent) Process(onMessage func(message *console.AgentMessageAttributes)) {
	costSent := false

	// If there is a message to send, send it first.
	if messageBuilder.Len() > 0 {
		onMessage(e.Attributes())
		costSent = true
	}

	// If there was an error, send that as well.
	if e.Status == StatusError {
		onMessage(e.ErrorAttributes(costSent))
	}
}

func (e *ResultEvent) Attributes() *console.AgentMessageAttributes {
	return &console.AgentMessageAttributes{
		Message: messageBuilder.String(),
		Role:    console.AiRoleAssistant,
		Cost:    e.Stats.Attributes(),
	}
}

func (e *ResultEvent) ErrorAttributes(costSent bool) *console.AgentMessageAttributes {
	attrs := &console.AgentMessageAttributes{
		Role:    console.AiRoleSystem,
		Message: e.Error.Message,
	}

	if !costSent {
		attrs.Cost = e.Stats.Attributes()
	}

	return attrs
}

type ResultError struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}
