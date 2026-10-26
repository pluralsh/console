package ping

import (
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/types"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/insights"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/store"
)

// existingStore reports the given UIDs as existing components, with the priority annotation they are given in muted.
type existingStore struct {
	store.Store
	uids  map[string]struct{}
	muted map[string]string
}

func (s existingStore) GetPriorityAnnotation(uid types.UID) (string, bool, error) {
	_, ok := s.uids[string(uid)]
	return s.muted[string(uid)], ok, nil
}

func summaryOf(roots ...insights.Root) insights.Summary {
	return insights.Summarize(roots, nil, time.Now())
}

func failing(name string, criticality int) insights.Root {
	return insights.Root{UID: name, Kind: "Deployment", Name: name, Criticality: criticality}
}

func names(entries []insights.Entry) []string {
	result := make([]string, 0, len(entries))
	for _, e := range entries {
		result = append(result, e.Name)
	}
	return result
}

func TestGraceWindow(t *testing.T) {
	now := time.Now()
	db := existingStore{uids: map[string]struct{}{"api": {}, "worker": {}}}

	t.Run("keeps a recovered root with its last priority until the period ends", func(t *testing.T) {
		g := newGraceWindow(10 * time.Minute)
		g.apply(summaryOf(failing("api", insights.ThresholdCritical)), db, now)

		entries := g.apply(summaryOf(), db, now.Add(5*time.Minute))

		require.Equal(t, []string{"api"}, names(entries))
		assert.Equal(t, insights.PriorityCritical, entries[0].Priority)
		assert.Empty(t, g.apply(summaryOf(), db, now.Add(10*time.Minute)))
	})

	t.Run("restarts the period while the root keeps failing", func(t *testing.T) {
		g := newGraceWindow(10 * time.Minute)
		g.apply(summaryOf(failing("api", insights.ScoreCore)), db, now)
		g.apply(summaryOf(failing("api", insights.ScoreCore)), db, now.Add(8*time.Minute))

		assert.Equal(t, []string{"api"}, names(g.apply(summaryOf(), db, now.Add(15*time.Minute))))
	})

	t.Run("reports a failing root once", func(t *testing.T) {
		g := newGraceWindow(10 * time.Minute)

		entries := g.apply(summaryOf(failing("api", insights.ScoreCore)), db, now)
		entries = g.apply(summaryOf(failing("api", insights.ScoreCore)), db, now.Add(time.Minute))

		assert.Equal(t, []string{"api"}, names(entries))
	})

	t.Run("drops a deleted root at once", func(t *testing.T) {
		g := newGraceWindow(10 * time.Minute)
		g.apply(summaryOf(failing("gone", insights.ScoreCore)), db, now)

		assert.Empty(t, g.apply(summaryOf(), db, now.Add(time.Minute)))
	})

	t.Run("drops a root that became ignored at once", func(t *testing.T) {
		g := newGraceWindow(10 * time.Minute)
		g.apply(summaryOf(failing("api", insights.ScoreCore)), db, now)

		ignored := failing("api", insights.ScoreCore)
		ignored.PriorityAnnotation = insights.Ignore

		assert.Empty(t, g.apply(summaryOf(ignored), db, now.Add(time.Minute)))
		assert.Empty(t, g.apply(summaryOf(), db, now.Add(2*time.Minute)), "and it stays dropped")
	})

	t.Run("drops a recovered root that was muted since", func(t *testing.T) {
		muted := existingStore{uids: map[string]struct{}{"api": {}}, muted: map[string]string{"api": insights.Ignore}}
		g := newGraceWindow(10 * time.Minute)
		g.apply(summaryOf(failing("api", insights.ScoreCore)), muted, now)

		assert.Empty(t, g.apply(summaryOf(), muted, now.Add(time.Minute)))
	})

	t.Run("a zero period disables the window", func(t *testing.T) {
		g := newGraceWindow(0)
		g.apply(summaryOf(failing("api", insights.ScoreCore)), db, now)

		assert.Empty(t, g.apply(summaryOf(), db, now.Add(time.Second)))
	})
}

type recordingConsole struct {
	client.Client
	pings []console.ClusterPing
	// failFirst makes the first ping fail like an old Console server rejecting unknown fields.
	failFirst bool
}

func (r *recordingConsole) PingCluster(attrs console.ClusterPing) error {
	serviceIDs := make([]*console.ClusterInsightComponentAttributes, len(attrs.InsightComponents))
	for i, c := range attrs.InsightComponents {
		copied := *c
		serviceIDs[i] = &copied
	}
	attrs.InsightComponents = serviceIDs
	r.pings = append(r.pings, attrs)
	if r.failFirst && len(r.pings) == 1 {
		return errors.New("unknown field serviceId")
	}
	return nil
}

func TestPingWithFallback(t *testing.T) {
	attrs := func() console.ClusterPing {
		return console.ClusterPing{
			Distro: new(console.ClusterDistroEks),
			InsightComponents: []*console.ClusterInsightComponentAttributes{
				{Kind: "Deployment", Name: "api", ServiceID: new("svc-1")},
			},
		}
	}

	t.Run("sends everything to a Console that understands it", func(t *testing.T) {
		c := &recordingConsole{}

		require.NoError(t, pingWithFallback(c, attrs()))

		require.Len(t, c.pings, 1)
		assert.Equal(t, "svc-1", *c.pings[0].InsightComponents[0].ServiceID)
	})

	t.Run("retries without the service ids and the distro when the ping is rejected", func(t *testing.T) {
		c := &recordingConsole{failFirst: true}

		require.NoError(t, pingWithFallback(c, attrs()))

		require.Len(t, c.pings, 2)
		assert.NotNil(t, c.pings[0].InsightComponents[0].ServiceID)
		assert.Nil(t, c.pings[1].InsightComponents[0].ServiceID)
		assert.Nil(t, c.pings[1].Distro)
		assert.Equal(t, "api", c.pings[1].InsightComponents[0].Name, "the health score and insights are still sent")
	})
}
