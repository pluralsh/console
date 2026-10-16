package insights_test

import (
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/insights"
)

var now = time.Date(2026, 10, 9, 12, 0, 0, 0, time.UTC)

func root(name string, criticality int) insights.Root {
	return insights.Root{UID: name, Kind: "Deployment", Namespace: "apps", Name: name, Criticality: criticality, CriticalityReason: "test"}
}

func TestScore(t *testing.T) {
	tests := []struct {
		name string
		root insights.Root
		want int
	}{
		{name: "criticality alone", root: root("a", insights.ScoreMedium), want: insights.ScoreMedium},
		{name: "unclassified roots are low", root: root("a", 0), want: insights.ScoreLow},
		{name: "full outage adds the whole severity", root: withReplicas(root("a", insights.ScoreLow), 3, 0), want: insights.ScoreLow + insights.SeverityMax},
		{name: "partial outage adds a share", root: withReplicas(root("a", insights.ScoreLow), 3, 2), want: insights.ScoreLow + 7},
		{name: "all ready adds nothing", root: withReplicas(root("a", insights.ScoreLow), 3, 3), want: insights.ScoreLow},
		{name: "scaled to zero adds nothing", root: withReplicas(root("a", insights.ScoreLow), 0, 0), want: insights.ScoreLow},
		{name: "more ready than desired adds nothing", root: withReplicas(root("a", insights.ScoreLow), 2, 3), want: insights.ScoreLow},
		{name: "failing for an hour", root: failingFor(root("a", insights.ScoreLow), time.Hour), want: insights.ScoreLow + 3},
		{name: "failing for a day", root: failingFor(root("a", insights.ScoreLow), 25*time.Hour), want: insights.ScoreLow + 5},
		{name: "failing for minutes", root: failingFor(root("a", insights.ScoreLow), 5*time.Minute), want: insights.ScoreLow},
		{name: "capped at 100", root: failingFor(withReplicas(root("a", 95), 1, 0), 48*time.Hour), want: 100},

		// apps never reach HIGH on their own, however bad the failure is
		{name: "an app with a high base is capped below HIGH", root: withReplicas(root("a", insights.ScoreMedium), 1, 0), want: insights.ThresholdHigh - 1},
		{name: "an app failing for days is capped below HIGH", root: failingFor(withReplicas(root("a", insights.ScoreMedium), 2, 0), 72*time.Hour), want: insights.ThresholdHigh - 1},
		{name: "a total app outage is MEDIUM", root: withReplicas(root("a", insights.ScoreLow), 2, 0), want: insights.ScoreLow + insights.SeverityMax},

		// core components are HIGH when partly down and CRITICAL when most of them are down
		{name: "core partial outage stays HIGH", root: withReplicas(root("a", insights.ScoreCore), 2, 1), want: insights.ScoreCore + 10},
		{name: "core three quarters down is CRITICAL", root: withReplicas(root("a", insights.ScoreCore), 4, 1), want: insights.ThresholdCritical},
		{name: "core full outage is CRITICAL", root: withReplicas(root("a", insights.ScoreCore), 2, 0), want: insights.ScoreCore + insights.SeverityMax},
		{name: "core half down for a day is CRITICAL", root: failingFor(withReplicas(root("a", insights.ScoreCore), 2, 1), 25*time.Hour), want: insights.ThresholdCritical},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, insights.Score(tt.root, now))
		})
	}
}

func TestBucket(t *testing.T) {
	assert.Equal(t, insights.PriorityLow, insights.Bucket(0))
	assert.Equal(t, insights.PriorityLow, insights.Bucket(insights.ThresholdMedium-1))
	assert.Equal(t, insights.PriorityMedium, insights.Bucket(insights.ThresholdMedium))
	assert.Equal(t, insights.PriorityHigh, insights.Bucket(insights.ThresholdHigh))
	assert.Equal(t, insights.PriorityCritical, insights.Bucket(insights.ThresholdCritical))
	assert.Equal(t, insights.PriorityCritical, insights.Bucket(100))

	// a full outage lifts a failure by exactly one bucket, never two. Apps are additionally capped below HIGH in Score.
	for _, c := range []struct{ base, want insights.Priority }{
		{insights.Bucket(insights.ScoreLow + insights.SeverityMax), insights.PriorityMedium},
		{insights.Bucket(insights.ScoreMedium + insights.SeverityMax), insights.PriorityHigh},
		{insights.Bucket(insights.ScoreCore + insights.SeverityMax), insights.PriorityCritical},
	} {
		assert.Equal(t, c.want, c.base)
	}
}

func TestResolve(t *testing.T) {
	overrides := map[string]insights.Override{"a": {Priority: insights.PriorityHigh, Reason: "script says so"}}

	t.Run("built-in", func(t *testing.T) {
		e := insights.Resolve(root("b", insights.ScoreMedium), overrides, now)
		assert.Equal(t, insights.PriorityMedium, e.Priority)
		assert.Equal(t, "built-in", e.Source)
		assert.Equal(t, "test", e.Reason)
	})

	t.Run("script overrides built-in", func(t *testing.T) {
		e := insights.Resolve(root("a", insights.ScoreLow), overrides, now)
		assert.Equal(t, insights.PriorityHigh, e.Priority)
		assert.Equal(t, "script", e.Source)
	})

	t.Run("annotation overrides script", func(t *testing.T) {
		r := root("a", insights.ScoreLow)
		r.PriorityAnnotation = "CRITICAL"

		e := insights.Resolve(r, overrides, now)

		assert.Equal(t, insights.PriorityCritical, e.Priority)
		assert.Equal(t, "annotation", e.Source)
	})
}

func TestSummarize(t *testing.T) {
	many := func(n int, criticality int) []insights.Root {
		roots := make([]insights.Root, n)
		for i := range roots {
			roots[i] = root(fmt.Sprintf("r-%d-%d", criticality, i), criticality)
		}
		return roots
	}

	t.Run("third party failures can not take the score below 60", func(t *testing.T) {
		roots := append(many(20, insights.ScoreLow), many(20, insights.ScoreMedium)...)

		s := insights.Summarize(roots, nil, now)

		assert.Equal(t, int64(60), s.HealthScore, "LOW cap 10 plus MEDIUM cap 30")
		assert.Len(t, s.Entries, 40, "the list is not capped")
	})

	t.Run("a healthy cluster scores 100", func(t *testing.T) {
		s := insights.Summarize(nil, nil, now)
		assert.Equal(t, int64(100), s.HealthScore)
		assert.Empty(t, s.Entries)
	})

	t.Run("one penalty per root by priority", func(t *testing.T) {
		assert.Equal(t, int64(98), insights.Summarize(many(1, insights.ScoreLow), nil, now).HealthScore)
		assert.Equal(t, int64(92), insights.Summarize(many(1, insights.ScoreMedium), nil, now).HealthScore)
		assert.Equal(t, int64(75), insights.Summarize(many(1, insights.ScoreCore), nil, now).HealthScore)
		assert.Equal(t, int64(50), insights.Summarize(many(1, insights.ThresholdCritical), nil, now).HealthScore)
	})

	t.Run("low failures can not leave the green band", func(t *testing.T) {
		s := insights.Summarize(many(500, insights.ScoreLow), nil, now)
		assert.Greater(t, s.HealthScore, int64(80))
	})

	t.Run("medium failures are capped more loosely", func(t *testing.T) {
		s := insights.Summarize(many(500, insights.ScoreMedium), nil, now)
		assert.Equal(t, int64(70), s.HealthScore)
	})

	t.Run("high and critical failures are not capped", func(t *testing.T) {
		assert.Equal(t, int64(0), insights.Summarize(many(10, insights.ScoreCore), nil, now).HealthScore)
		assert.Equal(t, int64(0), insights.Summarize(many(3, insights.ThresholdCritical), nil, now).HealthScore)
	})

	t.Run("ignored roots are in neither the list nor the score", func(t *testing.T) {
		roots := many(2, insights.ThresholdCritical)
		roots[0].PriorityAnnotation = "IGNORE"

		s := insights.Summarize(roots, nil, now)

		assert.Equal(t, int64(50), s.HealthScore)
		require.Len(t, s.Entries, 1)
		assert.Equal(t, roots[1].UID, s.Entries[0].UID)
	})

	t.Run("overrides move both the list and the score", func(t *testing.T) {
		roots := many(1, insights.ScoreLow)

		s := insights.Summarize(roots, map[string]insights.Override{roots[0].UID: {Priority: insights.PriorityCritical}}, now)

		assert.Equal(t, int64(50), s.HealthScore)
		assert.Equal(t, insights.PriorityCritical, s.Entries[0].Priority)
	})

	t.Run("most urgent first, then a stable order", func(t *testing.T) {
		pinned := root("pinned", insights.ScoreLow)
		pinned.PriorityAnnotation = "CRITICAL"
		b, a := root("b", insights.ScoreMedium), root("a", insights.ScoreMedium)
		critical := root("critical", insights.ThresholdCritical)

		s := insights.Summarize([]insights.Root{b, a, pinned, critical}, nil, now)

		var names []string
		for _, e := range s.Entries {
			names = append(names, e.Name)
		}
		assert.Equal(t, []string{"critical", "pinned", "a", "b"}, names)
	})
}

func withReplicas(r insights.Root, desired, ready int64) insights.Root {
	r.DesiredReplicas, r.ReadyReplicas = &desired, &ready
	return r
}

func failingFor(r insights.Root, d time.Duration) insights.Root {
	r.FailingSince = now.Add(-d)
	return r
}
