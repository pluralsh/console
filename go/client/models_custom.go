package client

import "encoding/json"

type ClusterPing struct {
	CurrentVersion   string         `json:"currentVersion"`
	KubeletVersion   *string        `json:"kubeletVersion,omitempty"`
	Distro           *ClusterDistro `json:"distro,omitempty"`
	HealthScore      *int64         `json:"healthScore,omitempty"`
	OpenshiftVersion *string        `json:"openshiftVersion,omitempty"`
	NodeCount        *int64         `json:"nodeCount,omitempty"`
	PodCount         *int64         `json:"podCount,omitempty"`
	NamespaceCount   *int64         `json:"namespaceCount,omitempty"`
	CPUTotal         *float64       `json:"cpuTotal,omitempty"`
	MemoryTotal      *float64       `json:"memoryTotal,omitempty"`
	CPUUtil          *float64       `json:"cpuUtil,omitempty"`
	MemoryUtil       *float64       `json:"memoryUtil,omitempty"`
	// the interval in seconds between pings to the cluster
	PingInterval      *int64    `json:"pingInterval,omitempty"`
	AvailabilityZones []*string `json:"availabilityZones,omitempty"`
	// scraped k8s objects to use for cluster insights, don't send at all if not w/in the last scrape interval
	InsightComponents []*ClusterInsightComponentAttributes `json:"insightComponents"`
	NodeStatistics    []*NodeStatisticAttributes           `json:"nodeStatistics"`
}

// Optional: enforce non-nil empty slice during marshalling
func (c ClusterPing) MarshalJSON() ([]byte, error) {
	if c.InsightComponents == nil {
		c.InsightComponents = []*ClusterInsightComponentAttributes{}
	}
	if c.NodeStatistics == nil {
		c.NodeStatistics = []*NodeStatisticAttributes{}
	}
	return json.Marshal(struct {
		CurrentVersion    string                               `json:"currentVersion"`
		KubeletVersion    *string                              `json:"kubeletVersion,omitempty"`
		Distro            *ClusterDistro                       `json:"distro,omitempty"`
		HealthScore       *int64                               `json:"healthScore,omitempty"`
		OpenshiftVersion  *string                              `json:"openshiftVersion,omitempty"`
		NodeCount         *int64                               `json:"nodeCount,omitempty"`
		PodCount          *int64                               `json:"podCount,omitempty"`
		NamespaceCount    *int64                               `json:"namespaceCount,omitempty"`
		CPUTotal          *float64                             `json:"cpuTotal,omitempty"`
		MemoryTotal       *float64                             `json:"memoryTotal,omitempty"`
		CPUUtil           *float64                             `json:"cpuUtil,omitempty"`
		MemoryUtil        *float64                             `json:"memoryUtil,omitempty"`
		PingInterval      *int64                               `json:"pingInterval,omitempty"`
		InsightComponents []*ClusterInsightComponentAttributes `json:"insightComponents"`
		AvailabilityZones []*string                            `json:"availabilityZones,omitempty"`
		NodeStatistics    []*NodeStatisticAttributes           `json:"nodeStatistics"`
	}{
		CurrentVersion:    c.CurrentVersion,
		KubeletVersion:    c.KubeletVersion,
		Distro:            c.Distro,
		HealthScore:       c.HealthScore,
		OpenshiftVersion:  c.OpenshiftVersion,
		NodeCount:         c.NodeCount,
		PodCount:          c.PodCount,
		NamespaceCount:    c.NamespaceCount,
		CPUTotal:          c.CPUTotal,
		MemoryTotal:       c.MemoryTotal,
		CPUUtil:           c.CPUUtil,
		MemoryUtil:        c.MemoryUtil,
		PingInterval:      c.PingInterval,
		InsightComponents: c.InsightComponents,
		AvailabilityZones: c.AvailabilityZones,
		NodeStatistics:    c.NodeStatistics,
	})
}
