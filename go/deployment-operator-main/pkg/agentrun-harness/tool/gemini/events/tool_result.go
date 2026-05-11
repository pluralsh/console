package events

import (
	"encoding/json"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/deployment-operator/pkg/log"
	"github.com/samber/lo"
	"k8s.io/klog/v2"
)

type ToolStatus string

const (
	ToolStatusSuccess ToolStatus = "success"
	ToolStatusError   ToolStatus = "error"
)

func (s ToolStatus) Attributes() *console.AgentMessageToolState {
	switch s {
	case ToolStatusSuccess:
		return lo.ToPtr(console.AgentMessageToolStateCompleted)
	case ToolStatusError:
		return lo.ToPtr(console.AgentMessageToolStateError)
	default:
		return lo.ToPtr(console.AgentMessageToolStatePending)
	}
}

type ToolResultEvent struct {
	EventBase
	ToolID string           `json:"tool_id"`
	Status ToolStatus       `json:"status"`
	Output *string          `json:"output,omitempty"`
	Error  *ToolResultError `json:"error,omitempty"`
}

func (e *ToolResultEvent) Validate() bool {
	return e.Type == EventTypeToolResult && e.ToolID != ""
}

func (e *ToolResultEvent) Process(onMessage func(message *console.AgentMessageAttributes)) {
	onMessage(e.Attributes())
	klog.V(log.LogLevelDebug).Infof("processed tool result event for %s", e.ToolID)
}

func (e *ToolResultEvent) Attributes() *console.AgentMessageAttributes {
	attrs := &console.AgentMessageAttributes{
		Message: "__plrl_ignore__",
		Role:    console.AiRoleAssistant,
		Metadata: &console.AgentMessageMetadataAttributes{
			Tool: &console.AgentMessageToolAttributes{
				Name:   lo.ToPtr(e.ToolID),
				State:  e.Status.Attributes(),
				Output: e.Output,
			},
		},
	}

	if toolUse, ok := toolUseCache.Get(e.ToolID); ok {
		attrs.Metadata.Tool.Name = lo.ToPtr(toolUse.ToolName)

		input, err := json.Marshal(toolUse.Parameters)
		if err != nil {
			return attrs
		}

		attrs.Metadata.Tool.Input = lo.ToPtr(string(input))
	}

	return attrs
}

type ToolResultError struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}
