package opencode

import (
	"encoding/json"
	"testing"

	harnessusage "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/usage"
	"github.com/stretchr/testify/require"
)

func TestToolUseSetsStartedAndCompletedAtFromEventTime(t *testing.T) {
	line := `{"type":"tool_use","timestamp":1767036061199,"sessionID":"ses_1","part":{"id":"prt_1","sessionID":"ses_1","messageID":"msg_1","type":"tool","callID":"call_1","tool":"bash","state":{"status":"completed","input":{"command":"sleep 100"},"output":"","time":{"start":1767035960000,"end":1767036060000}}}}`

	event := &EventListResponse{}
	require.NoError(t, json.Unmarshal([]byte(line), event))

	aggregated := &Event{}
	aggregated.FromEventResponse(*event, harnessusage.New(nil))

	require.NotNil(t, aggregated.Message.Metadata)
	require.Equal(t, msToRFC3339(1767035960000), *aggregated.Message.Metadata.StartedAt)
	require.Equal(t, msToRFC3339(1767036060000), *aggregated.Message.Metadata.CompletedAt)
	require.Equal(t, "", *aggregated.Message.Metadata.Tool.Output)
}

func TestStepFinishRecordsUsage(t *testing.T) {
	line := `{"type":"step_finish","timestamp":1767036064273,"sessionID":"ses_1","part":{"id":"prt_1","sessionID":"ses_1","messageID":"msg_1","type":"step-finish","cost":0.001,"tokens":{"input":671,"output":8,"reasoning":2,"cache":{"read":21,"write":5}}}}`

	event := &EventListResponse{}
	require.NoError(t, json.Unmarshal([]byte(line), event))

	recorder := harnessusage.New(nil)
	aggregated := &Event{}
	aggregated.FromEventResponse(*event, recorder)

	require.True(t, aggregated.Done)
	require.NotNil(t, aggregated.Message.Cost)
	require.Equal(t, 0.001, aggregated.Message.Cost.Total)
	require.Equal(t, float64(671), *aggregated.Message.Cost.Tokens.Input)
	require.Equal(t, float64(8), *aggregated.Message.Cost.Tokens.Output)
	require.Equal(t, float64(2), *aggregated.Message.Cost.Tokens.Reasoning)

	attrs := recorder.Attributes()
	require.NotNil(t, attrs)
	require.Equal(t, int64(671), *attrs.InputTokens)
	require.Equal(t, int64(8), *attrs.OutputTokens)
	require.Equal(t, int64(679), *attrs.TotalTokens)
	require.Equal(t, int64(26), *attrs.CachedTokens)
	require.Equal(t, int64(2), *attrs.ReasoningTokens)
	require.Equal(t, 0.001, *attrs.TotalCost)
}
