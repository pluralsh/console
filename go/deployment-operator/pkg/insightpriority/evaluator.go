package insightpriority

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"

	"k8s.io/apimachinery/pkg/types"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/internal/metrics"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/insights"
)

// Cluster is what scripts are told about the cluster as a whole.
type Cluster struct {
	Nodes      int64
	Namespaces int64
}

// RunFunc calls the evaluate function of a script with an input and returns what it returned, as JSON.
type RunFunc func(ctx context.Context, script string, input any) (json.RawMessage, error)

// Evaluator runs the registered scripts over the failing roots of a ping.
type Evaluator struct {
	registry *Registry
	run      RunFunc
}

func NewEvaluator(registry *Registry) *Evaluator {
	return &Evaluator{registry: registry, run: Run}
}

// Overrides gives every failing root to the script that owns it, and returns the priorities the scripts decided.
//
// A root is owned by at most one script, the matching one with the highest precedence, scripts are not chained and a
// script never sees a root that is decided by its annotation. A script that fails only loses its own roots to the
// built-in priority. The result is the same for the same input, nothing time or state dependent reaches a script.
func (e *Evaluator) Overrides(ctx context.Context, roots []insights.Root, cluster Cluster, now time.Time) map[string]insights.Override {
	scripts := e.registry.Scripts()
	if len(scripts) == 0 || len(roots) == 0 {
		return nil
	}

	owned := make(map[types.NamespacedName][]insights.Entry, len(scripts))
	results := make(map[types.NamespacedName]Result, len(scripts))
	lostTo := make(map[types.NamespacedName]map[types.NamespacedName]struct{})

	failing := make([]map[string]any, 0, len(roots))
	for _, root := range roots {
		entry := insights.Resolve(root, nil, now)
		failing = append(failing, map[string]any{
			"kind":             root.Kind,
			"namespace":        root.Namespace,
			"name":             root.Name,
			"builtin_priority": entry.Priority,
		})

		if root.PriorityAnnotation != "" {
			continue
		}

		var winner *Script
		for i := range scripts {
			if !scripts[i].Matches(root) {
				continue
			}

			if winner == nil {
				winner = &scripts[i]
				owned[winner.Key] = append(owned[winner.Key], entry)
				continue
			}

			if lostTo[scripts[i].Key] == nil {
				lostTo[scripts[i].Key] = make(map[types.NamespacedName]struct{})
			}
			lostTo[scripts[i].Key][winner.Key] = struct{}{}
		}
	}

	overrides := make(map[string]insights.Override)
	for _, script := range scripts {
		result := e.evaluate(ctx, script, owned[script.Key], failing, cluster, now, overrides)
		result.Time = now
		for winner := range lostTo[script.Key] {
			result.LostTo = append(result.LostTo, winner)
		}
		slices.SortFunc(result.LostTo, func(a, b types.NamespacedName) int { return strings.Compare(a.String(), b.String()) })
		results[script.Key] = result
	}

	e.registry.record(results)
	return overrides
}

// evaluate runs one script over its entries and adds what it decided to overrides. When the script fails nothing is added.
func (e *Evaluator) evaluate(ctx context.Context, script Script, entries []insights.Entry, failing []map[string]any, cluster Cluster, now time.Time, overrides map[string]insights.Override) Result {
	result := Result{Matched: len(entries)}
	if len(entries) == 0 {
		return result
	}

	start := time.Now()
	decided, err := e.decide(ctx, script, entries, failing, cluster, now)
	result.Duration = time.Since(start)
	if err != nil {
		result.Err = err.Error()
		klog.ErrorS(err, "insight priority script failed, using built-in priorities", "script", script.Key.String())
		metrics.Record().InsightPriorityFailure(script.Key.String())
		return result
	}

	for uid, override := range decided {
		overrides[uid] = override
		if override.Priority == insights.PriorityIgnore {
			result.Ignored++
		} else {
			result.Overridden++
		}
	}
	return result
}

type scriptOutput struct {
	Priority string `json:"priority"`
	Reason   string `json:"reason"`
}

func (e *Evaluator) decide(ctx context.Context, script Script, entries []insights.Entry, failing []map[string]any, cluster Cluster, now time.Time) (map[string]insights.Override, error) {
	rows := make([]map[string]any, 0, len(entries))
	known := make(map[string]struct{}, len(entries))
	for _, entry := range entries {
		rows = append(rows, row(entry))
		known[entry.UID] = struct{}{}
	}

	raw, err := e.run(ctx, script.Source, map[string]any{
		"now": now.UTC().Format(time.RFC3339),
		"cluster": map[string]any{
			"nodes":         cluster.Nodes,
			"namespaces":    cluster.Namespaces,
			"failing_roots": failing,
		},
		"rows": rows,
	})
	if err != nil {
		return nil, fmt.Errorf("evaluation failed: %w", err)
	}

	var output map[string]scriptOutput
	if err := json.Unmarshal(raw, &output); err != nil {
		return nil, fmt.Errorf("evaluate must return a dictionary from uid to {\"priority\": ..., \"reason\": ...}")
	}

	decided := make(map[string]insights.Override, len(output))
	for uid, o := range output {
		if _, ok := known[uid]; !ok {
			return nil, errors.New("evaluate returned a uid that is not one of the rows it was given")
		}

		priority := insights.Priority(strings.ToUpper(strings.TrimSpace(o.Priority)))
		switch priority {
		case insights.PriorityLow, insights.PriorityMedium, insights.PriorityHigh, insights.PriorityCritical, insights.PriorityIgnore:
		default:
			return nil, errors.New("evaluate returned an invalid priority, expected LOW, MEDIUM, HIGH, CRITICAL or IGNORE")
		}

		decided[uid] = insights.Override{Priority: priority, Reason: o.Reason}
	}

	return decided, nil
}

// row is the view of a root a script gets. It carries no manifests, events, logs or annotations: they are not in the
// store, and fetching them would make a ping slow and its outcome depend on more than the input.
func row(e insights.Entry) map[string]any {
	descendants := make(map[string]any, len(e.Descendants))
	for kind, d := range e.Descendants {
		descendants[kind] = map[string]any{"failed": d.Failed, "pending": d.Pending}
	}

	labels := e.Labels
	if labels == nil {
		labels = map[string]string{}
	}

	return map[string]any{
		"uid":              e.UID,
		"group":            e.Group,
		"version":          e.Version,
		"kind":             e.Kind,
		"namespace":        e.Namespace,
		"name":             e.Name,
		"labels":           labels,
		"managed":          e.ServiceID != "",
		"service_id":       e.ServiceID,
		"priority_class":   e.PriorityClass,
		"state":            e.State,
		"health_message":   e.HealthMessage,
		"desired_replicas": e.DesiredReplicas,
		"ready_replicas":   e.ReadyReplicas,
		"descendants":      descendants,
		"created_at":       formatTime(e.CreatedAt),
		"failing_since":    formatTime(e.FailingSince),
		"criticality":      e.Criticality,
		"builtin_score":    e.Score,
		"builtin_priority": e.Priority,
		"builtin_reason":   e.Reason,
	}
}

func formatTime(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.UTC().Format(time.RFC3339)
}
