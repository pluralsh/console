package claude

import (
	"testing"

	console "github.com/pluralsh/console/go/client"
	harnessusage "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/usage"
	"github.com/stretchr/testify/require"
)

func TestClaudeUsageRecordsCacheTokensAsInput(t *testing.T) {
	recorder := harnessusage.New(nil)
	msg := mapClaudeContentToAgentMessage(&StreamEvent{
		Message: &MessageEvent{
			Role: string(console.AiRoleAssistant),
			Content: []ContentMsg{
				{Type: "text", Text: "done"},
			},
			Usage: &Usage{
				InputTokens:              10,
				OutputTokens:             5,
				CacheCreationInputTokens: 3,
				CacheReadInputTokens:     2,
			},
		},
	}, map[string]ContentMsg{}, recorder)

	require.NotNil(t, msg)
	require.NotNil(t, msg.Cost)
	require.Equal(t, float64(20), msg.Cost.Total)
	require.Equal(t, float64(15), *msg.Cost.Tokens.Input)
	require.Equal(t, float64(5), *msg.Cost.Tokens.Output)

	attrs := recorder.Attributes()
	require.NotNil(t, attrs)
	require.Equal(t, int64(15), *attrs.InputTokens)
	require.Equal(t, int64(5), *attrs.OutputTokens)
	require.Equal(t, int64(20), *attrs.TotalTokens)
	require.Equal(t, int64(5), *attrs.CachedTokens)
}
