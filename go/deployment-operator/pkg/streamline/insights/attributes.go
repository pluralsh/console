package insights

import (
	"github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
)

// Attributes converts the entries to the insight components reported to Console. It returns nil when there are none.
func Attributes(entries []Entry) []client.ClusterInsightComponentAttributes {
	if len(entries) == 0 {
		return nil
	}

	result := make([]client.ClusterInsightComponentAttributes, 0, len(entries))
	for _, e := range entries {
		priority := client.InsightComponentPriority(e.Priority)
		result = append(result, client.ClusterInsightComponentAttributes{
			Group:     lo.ToPtr(e.Group),
			Version:   e.Version,
			Kind:      e.Kind,
			Namespace: lo.EmptyableToPtr(e.Namespace),
			Name:      e.Name,
			Priority:  &priority,
			ServiceID: lo.EmptyableToPtr(e.ServiceID),
		})
	}
	return result
}
