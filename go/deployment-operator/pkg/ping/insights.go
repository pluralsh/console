package ping

import (
	"slices"
	"strings"
	"sync"
	"time"

	"k8s.io/apimachinery/pkg/types"

	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/insights"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/store"
)

// recentRoot is a failing root that was reported and has not been seen failing since.
type recentRoot struct {
	entry    insights.Entry
	lastSeen time.Time
}

// graceWindow keeps reporting a root for a while after it stops failing, with the priority it had when it was last seen.
//
// Console deletes the insight of a component that is missing from a ping, and generating a new one costs an LLM call,
// so a workload that flaps, or recovers and fails again, would regenerate its insight on every flap. The window only
// affects the list, the health score reflects recoveries immediately. Roots that are ignored or deleted leave at once.
type graceWindow struct {
	mu     sync.Mutex
	period time.Duration
	recent map[string]recentRoot
}

func newGraceWindow(period time.Duration) *graceWindow {
	return &graceWindow{period: period, recent: make(map[string]recentRoot)}
}

// apply returns the entries to report: the failing ones followed by the recently recovered ones.
func (g *graceWindow) apply(summary insights.Summary, db store.Store, now time.Time) []insights.Entry {
	g.mu.Lock()
	defer g.mu.Unlock()

	if g.period <= 0 {
		clear(g.recent)
		return summary.Entries
	}

	reported := make(map[string]struct{}, len(summary.Entries))
	for _, e := range summary.Entries {
		reported[e.UID] = struct{}{}
		g.recent[e.UID] = recentRoot{entry: e, lastSeen: now}
	}

	entries := summary.Entries
	var recovered []insights.Entry
	for uid, r := range g.recent {
		if _, ok := reported[uid]; ok {
			continue
		}

		if _, ignored := summary.Ignored[uid]; ignored || now.Sub(r.lastSeen) >= g.period || !visible(db, uid) {
			delete(g.recent, uid)
			continue
		}

		recovered = append(recovered, r.entry)
	}

	// map order is random, and the cap must not drop a different entry on every ping
	slices.SortFunc(recovered, func(a, b insights.Entry) int {
		if ra, rb := insights.Rank(a.Priority), insights.Rank(b.Priority); ra != rb {
			return rb - ra
		}
		if a.Score != b.Score {
			return b.Score - a.Score
		}
		return strings.Compare(a.UID, b.UID)
	})
	entries = append(entries[:len(entries):len(entries)], recovered...)

	return entries
}

// visible tells whether a recovered root may still be reported: it is stored and it was not muted since.
// summary.Ignored only knows the roots that are failing, so the annotation of a recovered one is read from the store.
func visible(db store.Store, uid string) bool {
	annotation, found, err := db.GetPriorityAnnotation(types.UID(uid))
	return err == nil && found && insights.Priority(annotation) != insights.PriorityIgnore
}
