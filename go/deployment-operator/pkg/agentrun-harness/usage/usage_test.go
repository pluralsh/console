package usage

import (
	"testing"

	console "github.com/pluralsh/console/go/client"
	"github.com/stretchr/testify/require"
)

func TestRecordUsageAccumulatesAndCallbacks(t *testing.T) {
	var callback *console.AiUsageAttributes
	u := New(nil, func(attrs *console.AiUsageAttributes) {
		callback = attrs
	})

	u.RecordUsage(Record{
		InputTokens:     10,
		OutputTokens:    5,
		CachedTokens:    3,
		ReasoningTokens: 2,
		TotalCost:       0.25,
	})
	u.RecordUsage(Record{
		InputTokens:  7,
		OutputTokens: 1,
		InputCost:    0.1,
		OutputCost:   0.2,
	})

	attrs := u.Attributes()
	require.NotNil(t, attrs)
	require.Equal(t, int64(17), *attrs.InputTokens)
	require.Equal(t, int64(6), *attrs.OutputTokens)
	require.Equal(t, int64(23), *attrs.TotalTokens)
	require.Equal(t, int64(3), *attrs.CachedTokens)
	require.Equal(t, int64(2), *attrs.ReasoningTokens)
	require.Equal(t, 0.1, *attrs.InputCost)
	require.Equal(t, 0.2, *attrs.OutputCost)
	require.Equal(t, 0.25, *attrs.TotalCost)
	require.Equal(t, attrs, callback)
}

func TestNewPreservesExistingUsage(t *testing.T) {
	input := int64(10)
	totalCost := 0.5
	u := New(&console.AgentRunUsage{
		InputTokens: &input,
		TotalCost:   &totalCost,
	}, nil)

	attrs := u.Attributes()
	require.NotNil(t, attrs)
	require.Equal(t, int64(10), *attrs.InputTokens)
	require.Equal(t, 0.5, *attrs.TotalCost)
}
