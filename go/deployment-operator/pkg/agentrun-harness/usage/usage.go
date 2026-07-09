package usage

import (
	"sync"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
)

// Usage is the central run-level token and cost accumulator for agent harnesses.
type Usage struct {
	mu sync.Mutex

	inputTokens     int64
	outputTokens    int64
	totalTokens     int64
	cachedTokens    int64
	reasoningTokens int64
	inputCost       float64
	outputCost      float64
	totalCost       float64
}

// Record contains a single provider usage event, normalized to the Console schema.
type Record struct {
	InputTokens     int64
	OutputTokens    int64
	TotalTokens     int64
	CachedTokens    int64
	ReasoningTokens int64
	InputCost       float64
	OutputCost      float64
	TotalCost       float64
}

func New(existing *console.AgentRunUsage) *Usage {
	u := &Usage{}
	if existing == nil {
		return u
	}
	if existing.InputTokens != nil {
		u.inputTokens = *existing.InputTokens
	}
	if existing.OutputTokens != nil {
		u.outputTokens = *existing.OutputTokens
	}
	if existing.TotalTokens != nil {
		u.totalTokens = *existing.TotalTokens
	}
	if existing.CachedTokens != nil {
		u.cachedTokens = *existing.CachedTokens
	}
	if existing.ReasoningTokens != nil {
		u.reasoningTokens = *existing.ReasoningTokens
	}
	if existing.InputCost != nil {
		u.inputCost = *existing.InputCost
	}
	if existing.OutputCost != nil {
		u.outputCost = *existing.OutputCost
	}
	if existing.TotalCost != nil {
		u.totalCost = *existing.TotalCost
	}
	return u
}

func (u *Usage) RecordUsage(record Record) {
	if u == nil || record.empty() {
		return
	}

	u.mu.Lock()
	u.inputTokens += record.InputTokens
	u.outputTokens += record.OutputTokens
	u.cachedTokens += record.CachedTokens
	u.reasoningTokens += record.ReasoningTokens
	u.inputCost += record.InputCost
	u.outputCost += record.OutputCost
	u.totalCost += record.TotalCost
	if record.TotalTokens > 0 {
		u.totalTokens += record.TotalTokens
	} else {
		u.totalTokens += record.InputTokens + record.OutputTokens
	}
	u.mu.Unlock()
}

func (u *Usage) Attributes() *console.AiUsageAttributes {
	if u == nil {
		return nil
	}

	u.mu.Lock()
	defer u.mu.Unlock()
	return u.attributesLocked()
}

func (u *Usage) attributesLocked() *console.AiUsageAttributes {
	if u.emptyLocked() {
		return nil
	}

	return &console.AiUsageAttributes{
		InputTokens:     lo.ToPtr(u.inputTokens),
		OutputTokens:    lo.ToPtr(u.outputTokens),
		TotalTokens:     lo.ToPtr(u.totalTokens),
		CachedTokens:    lo.ToPtr(u.cachedTokens),
		ReasoningTokens: lo.ToPtr(u.reasoningTokens),
		InputCost:       lo.ToPtr(u.inputCost),
		OutputCost:      lo.ToPtr(u.outputCost),
		TotalCost:       lo.ToPtr(u.totalCost),
	}
}

func (u *Usage) emptyLocked() bool {
	return u.inputTokens == 0 &&
		u.outputTokens == 0 &&
		u.totalTokens == 0 &&
		u.cachedTokens == 0 &&
		u.reasoningTokens == 0 &&
		u.inputCost == 0 &&
		u.outputCost == 0 &&
		u.totalCost == 0
}

func (r Record) empty() bool {
	return r.InputTokens == 0 &&
		r.OutputTokens == 0 &&
		r.TotalTokens == 0 &&
		r.CachedTokens == 0 &&
		r.ReasoningTokens == 0 &&
		r.InputCost == 0 &&
		r.OutputCost == 0 &&
		r.TotalCost == 0
}
