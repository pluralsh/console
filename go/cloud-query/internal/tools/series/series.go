// Package series groups metric samples into series and expands series back into flat points.
package series

import (
	"sort"
	"strings"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

const (
	// MaxSamples caps the samples returned per series. Finer resolution only costs callers, which encode every
	// point for a model that sees a truncated slice of them.
	MaxSamples = 1_000

	// MaxSeries caps the series returned per query.
	MaxSeries = 100
)

// MinStep is the smallest step keeping a series from start to end within MaxSamples, rounded up to a whole second.
func MinStep(start, end time.Time) time.Duration {
	span := end.Sub(start)
	if span <= 0 {
		return 0
	}

	step := (span + MaxSamples - 1) / MaxSamples
	return (step + time.Second - 1).Truncate(time.Second)
}

// Bound drops series past MaxSeries and evenly thins the rest to MaxSamples, keeping each series' first and last
// sample. It backstops providers whose resolution can't be set from the request.
func Bound(output *toolquery.MetricsSeriesOutput) *toolquery.MetricsSeriesOutput {
	if output == nil {
		return nil
	}

	if len(output.Series) > MaxSeries {
		output.Series = output.Series[:MaxSeries]
	}

	for _, s := range output.Series {
		s.Samples = thin(s.Samples, MaxSamples)
	}

	return output
}

func thin(samples []*toolquery.MetricSample, limit int) []*toolquery.MetricSample {
	if len(samples) <= limit {
		return samples
	}

	last := len(samples) - 1
	thinned := make([]*toolquery.MetricSample, limit)
	for i := range limit {
		thinned[i] = samples[i*last/(limit-1)]
	}

	return thinned
}

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
