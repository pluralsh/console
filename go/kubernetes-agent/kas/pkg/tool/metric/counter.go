package metric

type Counter interface {
	// Inc increment the counter by 1
	Inc()
}

// MultiCounter wraps multiple counters into "one"
// This is can be useful when having a prometheus and a usage_metric counter
// for the same metric.
type MultiCounter []Counter

// NewMultiCounter wraps multiple counters into a single one.
// Every call to Inc() will be dispatched to each counter.
func NewMultiCounter(counters ...Counter) MultiCounter {
	return counters
}

func (m MultiCounter) Inc() {
	for _, c := range m {
		c.Inc()
	}
}
