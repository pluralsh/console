package usage_metrics

import (
	"reflect"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/google/go-cmp/cmp/cmpopts"
	"github.com/stretchr/testify/require"
)

var (
	_ Counter               = &counter{}
	_ UsageTrackerInterface = &UsageTracker{}
)

func TestUsageTracker(t *testing.T) {
	u := NewUsageTracker()
	c := u.RegisterCounter("x")
	require.Contains(t, u.counters, "x")
	s := u.RegisterUniqueCounter("y")
	require.Contains(t, u.uniqueCounters, "y")

	ud := u.CloneUsageData()
	expectedCounters := map[string]int64{}
	require.Equal(t, expectedCounters, ud.Counters)
	expectedUniqueCounters := map[string][]int64{}
	require.Equal(t, true, reflect.DeepEqual(expectedUniqueCounters, ud.UniqueCounters))

	c.Inc()
	s.Add(1)
	s.Add(3)
	ud = u.CloneUsageData()
	expectedCounters = map[string]int64{
		"x": 1,
	}
	require.Equal(t, expectedCounters, ud.Counters)
	expectedUniqueCounters = map[string][]int64{
		"y": {3, 1},
	}
	requireEqual(t, expectedUniqueCounters, ud)

	u.Subtract(ud)
	ud = u.CloneUsageData()
	require.Empty(t, ud.Counters)
	require.Empty(t, ud.UniqueCounters)
}

func requireEqual(t *testing.T, expectedUniqueCounters map[string][]int64, ud *UsageData) {
	require.Empty(t, cmp.Diff(expectedUniqueCounters, ud.UniqueCounters, cmpopts.SortSlices(func(x, y int64) bool { return x < y })))
}
