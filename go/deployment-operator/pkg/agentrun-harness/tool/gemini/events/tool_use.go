package events

import (
	cmap "github.com/orcaman/concurrent-map/v2"
	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/deployment-operator/pkg/log"
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

func (e *ToolUseEvent) Process(onMessage func(message *console.AgentMessageAttributes)) {
	// If any of the tools is called, send the current message and reset the builder.
	if messageBuilder.Len() > 0 {
		onMessage(e.Attributes())
		messageBuilder.Reset()
	}

	toolUseCache.Set(e.ToolID, lo.FromPtr(e))
	klog.V(log.LogLevelDebug).Infof("saved tool use in the cache: %s", e.ToolName)
}

func (e *ToolUseEvent) Attributes() *console.AgentMessageAttributes {
	return &console.AgentMessageAttributes{
		Message: messageBuilder.String(),
		Role:    console.AiRoleAssistant,
	}
}
