package usage

import (
	"testing"

	console "github.com/pluralsh/console/go/client"
	"github.com/stretchr/testify/require"
)

func TestRecordUsageAccumulates(t *testing.T) {
	u := New(nil)

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
}

func TestNewPreservesExistingUsage(t *testing.T) {
	input := int64(10)
	totalCost := 0.5
	u := New(&console.AgentRunUsage{
		InputTokens: &input,
		TotalCost:   &totalCost,
	})

	attrs := u.Attributes()
	require.NotNil(t, attrs)
	require.Equal(t, int64(10), *attrs.InputTokens)
	require.Equal(t, 0.5, *attrs.TotalCost)
}

func TestRecordCumulativeCostTracksScopesAndResets(t *testing.T) {
	u := New(nil)
	for _, test := range []struct {
		name       string
		scope      string
		cumulative float64
		wantDelta  float64
	}{
		{name: "initial", scope: "session-1", cumulative: 4, wantDelta: 4},
		{name: "increase", scope: "session-1", cumulative: 7, wantDelta: 3},
		{name: "independent scope", scope: "session-2", cumulative: 2, wantDelta: 2},
		{name: "provider reset", scope: "session-1", cumulative: 2, wantDelta: 0},
		{name: "after reset", scope: "session-1", cumulative: 3, wantDelta: 1},
		{name: "negative snapshot", scope: "session-2", cumulative: -1, wantDelta: 0},
	} {
		t.Run(test.name, func(t *testing.T) {
			require.Equal(t, test.wantDelta, u.RecordCumulativeCost(test.scope, test.cumulative))
		})
	}

	attrs := u.Attributes()
	require.NotNil(t, attrs)
	require.Equal(t, 10.0, *attrs.TotalCost)
}

func TestRecordCumulativeCostDoesNotUseExistingTotal(t *testing.T) {
	existingTotal := 10.0
	u := New(&console.AgentRunUsage{TotalCost: &existingTotal})

	require.Equal(t, 4.0, u.RecordCumulativeCost("session-1", 4))
	attrs := u.Attributes()
	require.NotNil(t, attrs)
	require.Equal(t, 14.0, *attrs.TotalCost)
}
