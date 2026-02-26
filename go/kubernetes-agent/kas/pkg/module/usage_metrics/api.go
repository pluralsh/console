package usage_metrics

import (
	"fmt"
	"sync"
	"sync/atomic"
)

const (
	ModuleName = "usage_metrics"
)

type UsageData struct {
	Counters       map[string]int64
	UniqueCounters map[string][]int64
}

func (d *UsageData) IsEmpty() bool {
	return len(d.Counters) == 0 && len(d.UniqueCounters) == 0
}

type UniqueCounter interface {
	Add(int64)
}

type uniqueCounter struct {
	mu  sync.Mutex
	set map[int64]struct{}
}

func (uc *uniqueCounter) Add(item int64) {
	uc.mu.Lock()
	uc.set[item] = struct{}{}
	uc.mu.Unlock()
}

func (uc *uniqueCounter) subtract(items []int64) {
	uc.mu.Lock()

	for _, item := range items {
		delete(uc.set, item)
	}
	uc.mu.Unlock()
}

type Counter interface {
	// Inc increment the counter by 1.
	Inc()
}

type counter struct {
	// n is the first element in an allocated struct to ensure 64 bit alignment for atomic access.
	n int64
}

func (c *counter) Inc() {
	atomic.AddInt64(&c.n, 1)
}

func (c *counter) get() int64 {
	return atomic.LoadInt64(&c.n)
}

func (c *counter) subtract(n int64) {
	atomic.AddInt64(&c.n, -n)
}

type UsageTrackerRegisterer interface {
	RegisterCounter(name string) Counter
	RegisterUniqueCounter(name string) UniqueCounter
}

type UsageTrackerCollector interface {
	// CloneUsageData returns collected usage data.
	// Only non-zero counters are returned.
	CloneUsageData() *UsageData
	Subtract(data *UsageData)
}

type UsageTrackerInterface interface {
	UsageTrackerRegisterer
	UsageTrackerCollector
}

type UsageTracker struct {
	counters       map[string]*counter
	uniqueCounters map[string]*uniqueCounter
}

func NewUsageTracker() *UsageTracker {
	return &UsageTracker{
		counters:       map[string]*counter{},
		uniqueCounters: map[string]*uniqueCounter{},
	}
}

func (ut *UsageTracker) RegisterCounter(name string) Counter {
	if _, exists := ut.counters[name]; exists {
		panic(fmt.Errorf("counter with name %s already exists", name))
	}
	c := &counter{}
	ut.counters[name] = c
	return c
}

func (ut *UsageTracker) RegisterUniqueCounter(name string) UniqueCounter {
	if _, exists := ut.uniqueCounters[name]; exists {
		panic(fmt.Errorf("uniqueCounter with name %s already exists", name))
	}
	uc := &uniqueCounter{
		set: make(map[int64]struct{}),
	}
	ut.uniqueCounters[name] = uc
	return uc
}

func (ut *UsageTracker) CloneUsageData() *UsageData {
	return &UsageData{
		Counters:       ut.cloneCounters(),
		UniqueCounters: ut.cloneUniqueCounters(),
	}
}

func (ut *UsageTracker) cloneUniqueCounters() map[string][]int64 {
	c := make(map[string][]int64, len(ut.uniqueCounters))
	for name, dataSet := range ut.uniqueCounters {
		dataSet.mu.Lock()
		if len(dataSet.set) == 0 {
			dataSet.mu.Unlock()
			continue
		}
		clone := make([]int64, 0, len(dataSet.set))
		for i := range dataSet.set {
			clone = append(clone, i)
		}
		dataSet.mu.Unlock()
		c[name] = clone
	}

	return c
}

func (ut *UsageTracker) cloneCounters() map[string]int64 {
	c := make(map[string]int64, len(ut.counters))
	for name, counterItem := range ut.counters {
		n := counterItem.get()
		if n == 0 {
			continue
		}
		c[name] = n
	}
	return c
}

func (ut *UsageTracker) Subtract(ud *UsageData) {
	for name, dataSet := range ud.UniqueCounters {
		s := ut.uniqueCounters[name]
		s.subtract(dataSet)
	}
	for name, n := range ud.Counters {
		ut.counters[name].subtract(n)
	}
}
