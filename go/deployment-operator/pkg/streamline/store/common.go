package store

import (
	"github.com/pluralsh/console/go/client"
	"github.com/sahilm/fuzzy"
	"github.com/samber/lo"
	"k8s.io/klog/v2"
	"zombiezen.com/go/sqlite"
	"zombiezen.com/go/sqlite/sqlitex"
)

var (
	kindsInsightPriorities = map[string]client.InsightComponentPriority{
		"Ingress":     client.InsightComponentPriorityCritical,
		"Certificate": client.InsightComponentPriorityCritical, // cert-manager Certificate
		"StatefulSet": client.InsightComponentPriorityHigh,
		"DaemonSet":   client.InsightComponentPriorityMedium,
		"Deployment":  client.InsightComponentPriorityLow,
	}

	resourcesInsightPriorities = map[string]client.InsightComponentPriority{
		"certmanager":   client.InsightComponentPriorityCritical,
		"coredns":       client.InsightComponentPriorityCritical,
		"kubeproxy":     client.InsightComponentPriorityCritical,
		"istio":         client.InsightComponentPriorityCritical,
		"linkerd":       client.InsightComponentPriorityCritical,
		"csinode":       client.InsightComponentPriorityCritical,
		"csicontroller": client.InsightComponentPriorityCritical,
		"nodeexporter":  client.InsightComponentPriorityHigh,
	}
)

// InsightComponentPriority returns insight priority for a given component.
func InsightComponentPriority(name, namespace, kind string) *client.InsightComponentPriority {
	for resource, priority := range resourcesInsightPriorities {
		// Fuzzy match to find similar resources
		matches := fuzzy.Find(resource, []string{name, namespace})

		// Only consider first score threshold as it is the best match
		if len(matches) > 0 && matches[0].Score >= 200 {
			return lo.ToPtr(priority)
		}
	}

	// Check if the kind is directly mapped to a priority
	if priority, exists := kindsInsightPriorities[kind]; exists {
		return lo.ToPtr(priority)
	}

	// Default to low priority if no matches found
	return lo.ToPtr(client.InsightComponentPriorityLow)
}

// NodeStatisticHealth returns health status based on the number of pending pods.
func NodeStatisticHealth(pendingPods int64) *client.NodeStatisticHealth {
	switch {
	case pendingPods == 0:
		return lo.ToPtr(client.NodeStatisticHealthHealthy)
	case pendingPods <= 3:
		return lo.ToPtr(client.NodeStatisticHealthWarning)
	default:
		return lo.ToPtr(client.NodeStatisticHealthFailed)
	}
}

func WithTransaction(conn *sqlite.Conn, fn func() error) (err error) {
	if err = sqlitex.Execute(conn, "BEGIN IMMEDIATE", nil); err != nil {
		return err
	}

	defer func() {
		if p := recover(); p != nil {
			if e := sqlitex.Execute(conn, "ROLLBACK", nil); e != nil {
				klog.ErrorS(e, "failed to rollback transaction after panic")
			}
			panic(p)
		}

		if err != nil {
			if e := sqlitex.Execute(conn, "ROLLBACK", nil); e != nil {
				klog.ErrorS(e, "failed to rollback transaction")
			}
			return
		}

		if e := sqlitex.Execute(conn, "COMMIT", nil); e != nil {
			err = e
		}
	}()

	err = fn()
	return err
}
