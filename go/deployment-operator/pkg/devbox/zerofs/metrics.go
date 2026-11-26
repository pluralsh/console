package zerofs

import "github.com/prometheus/client_golang/prometheus"

// Collectors are the node plugin's metrics.
func (m *Manager) Collectors() []prometheus.Collector {
	return []prometheus.Collector{
		prometheus.NewCounterFunc(prometheus.CounterOpts{
			Name: "devbox_zerofs_writer_exits_total",
			Help: "Writers that exited while serving a volume, without the plugin stopping them.",
		}, func() float64 { return float64(m.writerExits.Load()) }),
		prometheus.NewGaugeFunc(prometheus.GaugeOpts{
			Name: "devbox_zerofs_writers",
			Help: "Writers serving a volume.",
		}, func() float64 { live, _ := m.countWriters(); return float64(live) }),
		prometheus.NewGaugeFunc(prometheus.GaugeOpts{
			Name: "devbox_zerofs_dead_writers",
			Help: "Volumes still staged whose writer exited: their box sees I/O errors until it's suspended.",
		}, func() float64 { _, dead := m.countWriters(); return float64(dead) }),
	}
}

func (m *Manager) countWriters() (live, dead int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, p := range m.writers {
		switch {
		case !p.exited():
			live++
		case !p.stopping:
			dead++
		}
	}
	return live, dead
}
