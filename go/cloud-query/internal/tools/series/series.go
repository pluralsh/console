// Package series groups metric samples into series and expands series back into flat points.
package series

import (
	"sort"
	"strings"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

// Flatten expands series into one point per sample, each carrying its series' name and labels.
func Flatten(output *toolquery.MetricsSeriesOutput) *toolquery.MetricsQueryOutput {
	size := 0
	for _, s := range output.GetSeries() {
		size += len(s.GetSamples())
	}

	metrics := make([]*toolquery.MetricPoint, 0, size)
	for _, s := range output.GetSeries() {
		for _, sample := range s.GetSamples() {
			metrics = append(metrics, &toolquery.MetricPoint{
				Timestamp: sample.GetTimestamp(),
				Name:      s.GetName(),
				Value:     sample.GetValue(),
				Labels:    s.GetLabels(),
			})
		}
	}

	return &toolquery.MetricsQueryOutput{Metrics: metrics}
}

// Builder groups samples into series keyed by name and labels, in first-seen order.
type Builder struct {
	series []*toolquery.MetricSeries
	index  map[string]*toolquery.MetricSeries
}

func NewBuilder() *Builder {
	return &Builder{index: map[string]*toolquery.MetricSeries{}}
}

// Add appends a sample to the series identified by name and labels. The labels map is retained, so callers must
// not mutate it afterwards.
func (b *Builder) Add(name string, labels map[string]string, timestamp time.Time, value float64) {
	key := seriesKey(name, labels)
	s, ok := b.index[key]
	if !ok {
		s = &toolquery.MetricSeries{Name: name, Labels: labels}
		b.index[key] = s
		b.series = append(b.series, s)
	}

	s.Samples = append(s.Samples, &toolquery.MetricSample{
		Timestamp: timestamppb.New(timestamp),
		Value:     value,
	})
}

func (b *Builder) Output() *toolquery.MetricsSeriesOutput {
	return &toolquery.MetricsSeriesOutput{Series: b.series}
}

func seriesKey(name string, labels map[string]string) string {
	keys := make([]string, 0, len(labels))
	for key := range labels {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	var key strings.Builder
	key.WriteString(name)
	for _, k := range keys {
		key.WriteByte(0)
		key.WriteString(k)
		key.WriteByte(0)
		key.WriteString(labels[k])
	}

	return key.String()
}
