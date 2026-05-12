package datasource

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

type OTLPResourceSpans struct {
	Resource struct {
		Attributes []OTLPKeyValue `json:"attributes"`
	} `json:"resource"`
	ScopeSpans                  []OTLPScopeSpans `json:"scopeSpans"`
	InstrumentationLibrarySpans []OTLPScopeSpans `json:"instrumentationLibrarySpans"`
}

type OTLPScopeSpans struct {
	Scope struct {
		Name    string `json:"name"`
		Version string `json:"version"`
	} `json:"scope"`
	Spans []OTLPSpan `json:"spans"`
}

type OTLPSpan struct {
	TraceID           string          `json:"traceId"`
	SpanID            string          `json:"spanId"`
	ParentSpanID      string          `json:"parentSpanId"`
	Name              string          `json:"name"`
	StartTimeUnixNano json.RawMessage `json:"startTimeUnixNano"`
	EndTimeUnixNano   json.RawMessage `json:"endTimeUnixNano"`
	Attributes        []OTLPKeyValue  `json:"attributes"`
}

type OTLPKeyValue struct {
	Key   string         `json:"key"`
	Value map[string]any `json:"value"`
}

// OTLPTraceResponse holds OTLP-formatted resource spans and provides shared parsing logic
// used by both Tempo and Jaeger trace responses.
type OTLPTraceResponse struct {
	ResourceSpans []OTLPResourceSpans `json:"resourceSpans"`
	Batches       []OTLPResourceSpans `json:"batches"`
}

func (o *OTLPTraceResponse) toResourceSpans() []OTLPResourceSpans {
	if o == nil {
		return nil
	}

	return append(o.ResourceSpans, o.Batches...)
}

func (o *OTLPTraceResponse) toScopeSpans(resourceSpan OTLPResourceSpans) []OTLPScopeSpans {
	if resourceSpan.ScopeSpans == nil {
		return resourceSpan.InstrumentationLibrarySpans
	}

	return append(resourceSpan.ScopeSpans, resourceSpan.InstrumentationLibrarySpans...)
}

func (o *OTLPTraceResponse) ToTraceSpans() []*toolquery.TraceSpan {
	if o == nil {
		return nil
	}

	spans := make([]*toolquery.TraceSpan, 0)
	for _, resourceSpan := range o.toResourceSpans() {
		resourceAttrs := o.otlpAttrsToMap(resourceSpan.Resource.Attributes)
		service := resourceAttrs["service.name"]

		for _, scopeSpan := range o.toScopeSpans(resourceSpan) {
			for _, span := range scopeSpan.Spans {
				startNs, err := o.parseOTLPNanos(span.StartTimeUnixNano)
				if err != nil {
					continue
				}
				endNs, err := o.parseOTLPNanos(span.EndTimeUnixNano)
				if err != nil {
					continue
				}

				start := time.Unix(0, startNs)
				end := time.Unix(0, endNs)

				tags := o.otlpAttrsToMap(span.Attributes)
				spans = append(spans, &toolquery.TraceSpan{
					TraceId:  span.TraceID,
					SpanId:   span.SpanID,
					ParentId: span.ParentSpanID,
					Name:     span.Name,
					Service:  service,
					Start:    timestamppb.New(start),
					End:      timestamppb.New(end),
					Tags:     tags,
				})
			}
		}
	}

	return spans
}

func (o *OTLPTraceResponse) parseOTLPNanos(raw json.RawMessage) (int64, error) {
	if len(raw) == 0 {
		return 0, fmt.Errorf("missing timestamp")
	}
	if raw[0] == '"' {
		var s string
		if err := json.Unmarshal(raw, &s); err != nil {
			return 0, err
		}
		return strconv.ParseInt(s, 10, 64)
	}
	var n json.Number
	if err := json.Unmarshal(raw, &n); err != nil {
		return 0, err
	}
	return n.Int64()
}

func (o *OTLPTraceResponse) otlpAttrsToMap(attrs []OTLPKeyValue) map[string]string {
	if len(attrs) == 0 {
		return map[string]string{}
	}
	out := make(map[string]string, len(attrs))
	for _, attr := range attrs {
		if len(attr.Value) == 0 {
			continue
		}
		for _, v := range attr.Value {
			out[attr.Key] = fmt.Sprint(v)
			break
		}
	}
	return out
}
