package events

import (
	"testing"

	console "github.com/pluralsh/console/go/client"
	"github.com/stretchr/testify/require"
)

func TestToolResultAttributesAlwaysSetsOutput(t *testing.T) {
	event := &ToolResultEvent{
		EventBase: EventBase{Type: EventTypeToolResult},
		ToolID:    "tool_1",
		Status:    ToolStatusSuccess,
	}

	attrs := event.Attributes()
	require.NotNil(t, attrs.Metadata)
	require.NotNil(t, attrs.Metadata.Tool)
	require.Equal(t, console.AgentMessageToolStateCompleted, *attrs.Metadata.Tool.State)
	require.NotNil(t, attrs.Metadata.Tool.Output)
	require.Equal(t, "", *attrs.Metadata.Tool.Output)
}

func TestToolResultAttributesUsesErrorMessageWhenOutputMissing(t *testing.T) {
	event := &ToolResultEvent{
		EventBase: EventBase{Type: EventTypeToolResult},
		ToolID:    "tool_1",
		Status:    ToolStatusError,
		Error:     &ToolResultError{Type: "fail", Message: "boom"},
	}

	attrs := event.Attributes()
	require.Equal(t, console.AgentMessageToolStateError, *attrs.Metadata.Tool.State)
	require.Equal(t, "boom", *attrs.Metadata.Tool.Output)
}
