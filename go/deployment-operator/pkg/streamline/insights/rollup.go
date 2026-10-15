package insights

import (
	"sort"
	"time"
)

// Priority is the urgency of a failing root.
type Priority string

const (
	PriorityLow      Priority = "LOW"
	PriorityMedium   Priority = "MEDIUM"
	PriorityHigh     Priority = "HIGH"
	PriorityCritical Priority = "CRITICAL"

	// PriorityIgnore is only valid as an annotation or an override. It removes a root from the insights and the health score.
	PriorityIgnore Priority = Ignore
)

// Health score penalties by priority. Low and medium failures are capped so that any number of them can not
// take a cluster out of the green band on their own, while high and critical failures always show.
const (
	penaltyLow      = 2
	penaltyMedium   = 8
	penaltyHigh     = 25
	penaltyCritical = 50

	capLow    = 10
	capMedium = 30

	maxScore = 100

	hour = time.Hour
	day  = 24 * time.Hour
)

// Root is a failing object that stands for all the failed objects it owns, with everything needed to prioritize it.
type Root struct {
	UID       string
	Group     string
	Version   string
	Kind      string
	Namespace string
	Name      string
	// ServiceID is the Plural service managing the root, inherited from its nearest ancestor that has one.
	ServiceID       string
	PriorityClass   string
	HealthMessage   string
	DesiredReplicas *int64
	ReadyReplicas   *int64
	// State is the health of the root itself: failed, or pending when only objects it owns are failing.
	State  string
	Labels map[string]string
	// Descendants counts the failed and pending objects the root owns by kind, the root itself excluded.
	Descendants        map[string]Descendants
	CreatedAt          time.Time
	FailingSince       time.Time
	Criticality        int
	CriticalityReason  string
	PriorityAnnotation string
}

// Descendants counts the unhealthy objects of one kind below a root.
type Descendants struct {
	Failed  int
	Pending int
}

// Override replaces the built-in priority of a root, it comes from a CustomInsightPriority script.
type Override struct {
	Priority Priority
	Reason   string
}

// Entry is a root together with its final priority.
type Entry struct {
	Root
	// Score is the built-in score, criticality plus severity.
	Score    int
	Priority Priority
	// Source says where the priority came from: annotation, script or built-in.
	Source string
	Reason string
}

// Summary is the result of one ping: the health score and the roots that explain it.
type Summary struct {
	HealthScore int64
	// Entries are sorted most urgent first. They never contain ignored roots.
	Entries []Entry
	// Ignored are the UIDs of the roots that were left out because they are ignored.
	Ignored map[string]struct{}
}

// Score is the built-in score of a root: its criticality plus how severe the failure is.
// Severity grows with the share of replicas that are not ready and with how long the root has been failing.
//
// A criticality below ThresholdHigh marks an app, whose score is capped below HIGH however bad the
// failure is. Only core components, which start at ScoreCore, can be HIGH or CRITICAL on their own.
// The annotation and CustomInsightPriority scripts are applied in Resolve and are not subject to the cap.
func Score(r Root, now time.Time) int {
	criticality := r.Criticality
	if criticality == 0 {
		criticality = ScoreLow
	}

	score := criticality
	if r.DesiredReplicas != nil && r.ReadyReplicas != nil && *r.DesiredReplicas > 0 {
		missing := max(*r.DesiredReplicas-*r.ReadyReplicas, 0)
		score += int(float64(SeverityMax)*float64(missing)/float64(*r.DesiredReplicas) + 0.5)
	}

	if !r.FailingSince.IsZero() {
		switch age := now.Sub(r.FailingSince); {
		case age >= day:
			score += 5
		case age >= hour:
			score += 3
		}
	}

	if criticality < ThresholdHigh {
		score = min(score, ThresholdHigh-1)
	}

	return min(score, maxScore)
}

// Bucket maps a score to a priority.
func Bucket(score int) Priority {
	switch {
	case score >= ThresholdCritical:
		return PriorityCritical
	case score >= ThresholdHigh:
		return PriorityHigh
	case score >= ThresholdMedium:
		return PriorityMedium
	default:
		return PriorityLow
	}
}

// Resolve decides the priority of a root. The first source that applies wins: the annotation on the object,
// a script override, the built-in score.
func Resolve(r Root, overrides map[string]Override, now time.Time) Entry {
	entry := Entry{Root: r, Score: Score(r, now)}

	if p := Priority(r.PriorityAnnotation); p != "" {
		entry.Priority, entry.Source, entry.Reason = p, "annotation", "annotation "+AnnotationPriority
		return entry
	}

	if o, ok := overrides[r.UID]; ok {
		entry.Priority, entry.Source, entry.Reason = o.Priority, "script", o.Reason
		return entry
	}

	entry.Priority, entry.Source, entry.Reason = Bucket(entry.Score), "built-in", r.CriticalityReason
	return entry
}

// Rank orders priorities, the most urgent has the highest rank.
func Rank(p Priority) int {
	switch p {
	case PriorityCritical:
		return 3
	case PriorityHigh:
		return 2
	case PriorityMedium:
		return 1
	default:
		return 0
	}
}

// Summarize computes the health score and the insights list from the same roots.
// Score is 100 minus the penalties of the roots, one penalty per root, so it does not depend on how many pods a root owns.
func Summarize(roots []Root, overrides map[string]Override, now time.Time) Summary {
	var counts [4]int
	ignored := make(map[string]struct{})
	entries := make([]Entry, 0, len(roots))
	for _, r := range roots {
		e := Resolve(r, overrides, now)
		switch e.Priority {
		case PriorityIgnore:
			ignored[r.UID] = struct{}{}
			continue
		case PriorityLow:
			counts[0]++
		case PriorityMedium:
			counts[1]++
		case PriorityHigh:
			counts[2]++
		case PriorityCritical:
			counts[3]++
		}
		entries = append(entries, e)
	}

	penalty := min(counts[0]*penaltyLow, capLow) +
		min(counts[1]*penaltyMedium, capMedium) +
		counts[2]*penaltyHigh +
		counts[3]*penaltyCritical

	sort.SliceStable(entries, func(i, j int) bool {
		a, b := entries[i], entries[j]
		switch {
		case Rank(a.Priority) != Rank(b.Priority):
			return Rank(a.Priority) > Rank(b.Priority)
		case a.Score != b.Score:
			return a.Score > b.Score
		case a.Kind != b.Kind:
			return a.Kind < b.Kind
		case a.Namespace != b.Namespace:
			return a.Namespace < b.Namespace
		default:
			return a.Name < b.Name
		}
	})

	return Summary{HealthScore: int64(max(maxScore-penalty, 0)), Entries: entries, Ignored: ignored}
}
