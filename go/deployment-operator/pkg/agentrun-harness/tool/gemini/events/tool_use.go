package events

import (
	"encoding/json"

	cmap "github.com/orcaman/concurrent-map/v2"
	console "github.com/pluralsh/console/go/client"
	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
	"github.com/samber/lo"
	"k8s.io/klog/v2"
)

var toolUseCache = cmap.New[ToolUseEvent]()

type ToolUseEvent struct {
	EventBase
	ToolName   string         `json:"tool_name"`
	ToolID     string         `json:"tool_id"`
	Parameters map[string]any `json:"parameters,omitempty"`
}

func (e *ToolUseEvent) Validate() bool {
	return e.Type == EventTypeToolUse && e.ToolID != "" && e.ToolName != ""
}

func (e *ToolUseEvent) Process(onMessage v1.MessageCallback) {
	// If any of the tools is called, send the current message and reset the builder.
	if messageBuilder.Len() > 0 {
		onMessage(e.Attributes(), "")
		messageBuilder.Reset()
	}

	toolUseCache.Set(e.ToolID, lo.FromPtr(e))
	klog.V(log.LogLevelDebug).Infof("saved tool use in the cache: %s", e.ToolName)
	onMessage(e.RunningAttributes(), e.ToolID)
}

func (e *ToolUseEvent) Attributes() *console.AgentMessageAttributes {
	return &console.AgentMessageAttributes{
		Message: messageBuilder.String(),
		Role:    console.AiRoleAssistant,
	}
}

func (e *ToolUseEvent) RunningAttributes() *console.AgentMessageAttributes {
	attrs := &console.AgentMessageAttributes{
		Message: "Called tool",
		Role:    console.AiRoleAssistant,
		Metadata: &console.AgentMessageMetadataAttributes{
			Tool: &console.AgentMessageToolAttributes{
				Name:   lo.ToPtr(e.ToolName),
				State:  lo.ToPtr(console.AgentMessageToolStateRunning),
				Output: lo.ToPtr(v1.RunningToolOutput),
			},
		},
	}
	if len(e.Parameters) > 0 {
		if input, err := json.Marshal(e.Parameters); err == nil {
			attrs.Metadata.Tool.Input = lo.ToPtr(string(input))
		}
	}
	return attrs
}
