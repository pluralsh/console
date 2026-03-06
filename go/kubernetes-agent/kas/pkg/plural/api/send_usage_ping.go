package api

import "context"

type UsagePingData struct {
	Counters       map[string]int64   `json:"counters,omitempty"`
	UniqueCounters map[string][]int64 `json:"unique_counters,omitempty"`
}

// TODO: Implement.
func SendUsagePing(_ context.Context, _ UsagePingData) error {
	return nil
}
