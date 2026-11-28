// Package zones keeps devbox instances whose homes live in one zone (Block homes) in that zone. The operator runs
// one WorkerPool per zone, labelled with Label; the gateway pins each instance to a zone with the actor's
// worker_selector at creation and packs new instances into the zone that already holds the most homes, so the
// autoscaler's spare capacity and minimum go to few zones rather than every one.
package zones

import (
	"sort"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

const (
	// Label is the WorkerPool label naming its zone, which an instance's worker_selector matches.
	Label = "devboxes.plural.sh/zone"
	// NodeLabel is the well-known node label a zonal pool's workers are scheduled by.
	NodeLabel = "topology.kubernetes.io/zone"
)

// Selector pins an actor to zone's workers.
func Selector(zone string) *ateapi.Selector {
	return &ateapi.Selector{MatchLabels: map[string]string{Label: zone}}
}

// OfActor is the zone an actor is pinned to, "" if none.
func OfActor(actor *ateapi.Actor) string {
	return actor.GetWorkerSelector().GetMatchLabels()[Label]
}

// Order sorts zones by the homes they hold, most first, keeping the given order between equals. The first is
// where new instances go and where the spare capacity is kept.
func Order(zones []string, homes map[string]int64) []string {
	out := append([]string(nil), zones...)
	sort.SliceStable(out, func(i, j int) bool { return homes[out[i]] > homes[out[j]] })
	return out
}

// Pick is the zone a new instance goes to: the first in Order with a free instance slot, else the first in Order,
// whose pool the autoscaler grows. It returns "" when zones is empty.
func Pick(zones []string, homes map[string]int64, free map[string]int64) string {
	ordered := Order(zones, homes)
	for _, zone := range ordered {
		if free[zone] > 0 {
			return zone
		}
	}
	if len(ordered) == 0 {
		return ""
	}
	return ordered[0]
}

// Spread deals n round-robin over ordered, so a runner-wide count such as the minimum workers isn't repeated in
// every zone.
func Spread(n int64, ordered []string) map[string]int64 {
	out := make(map[string]int64, len(ordered))
	if len(ordered) == 0 {
		return out
	}
	for i := int64(0); i < n; i++ {
		out[ordered[i%int64(len(ordered))]]++
	}
	return out
}
