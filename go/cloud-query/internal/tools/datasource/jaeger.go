package datasource

import (
	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

// JaegerTraceQuery holds the query parameters for the Jaeger v3 traces endpoint.
type JaegerTraceQuery struct {
	ServiceName   string
	OperationName string
	Attributes    map[string]string
	StartTimeMin  string
	StartTimeMax  string
	DurationMin   string
	DurationMax   string
	Limit         int32
}

// JaegerTracesResponse is the JSON response from GET /api/v3/traces.
type JaegerTracesResponse struct {
	Result JaegerTraceResponse `json:"result"`
}

// JaegerTraceResponse is returned by Jaeger Query v3 REST API (GET /api/v3/traces).
type JaegerTraceResponse struct {
	OTLPTraceResponse `json:",inline"`
}

func (r *JaegerTraceResponse) ToTracesQueryOutput() *toolquery.TracesQueryOutput {
	if r == nil {
		return &toolquery.TracesQueryOutput{}
	}

	return &toolquery.TracesQueryOutput{Spans: r.ToTraceSpans()}
}
