package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/elastic/go-elasticsearch/v9"
	"github.com/elastic/go-elasticsearch/v9/typedapi/core/search"
	"github.com/elastic/go-elasticsearch/v9/typedapi/esdsl"
	"github.com/elastic/go-elasticsearch/v9/typedapi/types"
	"github.com/elastic/go-elasticsearch/v9/typedapi/types/enums/operator"
	"github.com/samber/lo"
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
	"github.com/pluralsh/console/go/cloud-query/internal/tools/datasource"
)

type ElasticProvider struct {
	client *elasticsearch.TypedClient
	conn   *toolquery.ElasticConnection
}

func NewElasticProvider(conn *toolquery.ElasticConnection) (LogsProvider, error) {
	return (&ElasticProvider{conn: conn}).init()
}

func (in *ElasticProvider) init() (LogsProvider, error) {
	client, err := in.newElasticClient()
	if err != nil {
		return nil, err
	}

	in.client = client
	return in, nil
}

func (in *ElasticProvider) Logs(ctx context.Context, input *toolquery.LogsQueryInput) (*toolquery.LogsQueryOutput, error) {
	if in.conn == nil {
		return nil, ErrInvalidArgument
	}
	if input == nil || input.Query == "" {
		return nil, ErrInvalidArgument
	}

	resp, err := in.client.Search().
		Index(in.conn.GetIndex()).
		Header("Accept", "application/json").
		Header("Content-Type", "application/json").
		Request(in.toRequest(input)).
		Do(ctx)
	if err != nil {
		return nil, err
	}

	return in.toLogsQueryOutput(resp)
}

func (in *ElasticProvider) LogAggregate(ctx context.Context, input *toolquery.LogAggregateInput) (*toolquery.LogAggregateOutput, error) {
	if in.conn == nil {
		return nil, ErrInvalidArgument
	}
	if input == nil || input.Query == "" {
		return nil, ErrInvalidArgument
	}

	resp, err := in.client.Search().
		Index(in.conn.GetIndex()).
		Header("Accept", "application/json").
		Header("Content-Type", "application/json").
		Request(in.toAggregateRequest(input)).
		Do(ctx)
	if err != nil {
		return nil, err
	}

	aggregation, ok := resp.Aggregations["logs_over_time"].(*types.DateHistogramAggregate)
	if !ok {
		return &toolquery.LogAggregateOutput{Buckets: []*toolquery.LogAggregateBucket{}}, nil
	}

	buckets := make([]*toolquery.LogAggregateBucket, 0)
	switch values := aggregation.Buckets.(type) {
	case []types.DateHistogramBucket:
		for _, bucket := range values {
			buckets = append(buckets, elasticLogAggregateBucket(bucket))
		}
	case map[string]types.DateHistogramBucket:
		for _, bucket := range values {
			buckets = append(buckets, elasticLogAggregateBucket(bucket))
		}
	}

	return &toolquery.LogAggregateOutput{Buckets: buckets}, nil
}

func elasticLogAggregateBucket(bucket types.DateHistogramBucket) *toolquery.LogAggregateBucket {
	return &toolquery.LogAggregateBucket{
		Timestamp: timestamppb.New(time.UnixMilli(bucket.Key)),
		Count:     bucket.DocCount,
	}
}

func (in *ElasticProvider) toLogsQueryOutput(resp *search.Response) (*toolquery.LogsQueryOutput, error) {
	logs := make([]*toolquery.LogEntry, 0)

	for _, hit := range resp.Hits.Hits {
		if len(hit.Source_) == 0 {
			continue
		}

		var source datasource.ElasticSource
		if err := json.Unmarshal(hit.Source_, &source); err != nil {
			return nil, err
		}

		logEntry, err := source.ToLogsQueryOutput()
		if err != nil {
			return nil, err
		}
		logs = append(logs, logEntry)
	}

	return &toolquery.LogsQueryOutput{Logs: logs}, nil
}

func (in *ElasticProvider) toRequest(input *toolquery.LogsQueryInput) *search.Request {
	request := &search.Request{
		Query: in.elasticLogsQuery(input.Query, input.GetRange(), input.GetFacets(), nil),
	}

	if input.GetLimit() > 0 {
		request.Size = lo.ToPtr(int(input.GetLimit()))
	}

	return request
}

func (in *ElasticProvider) toAggregateRequest(input *toolquery.LogAggregateInput) *search.Request {
	defaultOperator := operator.And
	if input.GetOperator() == toolquery.LogQueryOperator_LOG_QUERY_OPERATOR_OR {
		defaultOperator = operator.Or
	}

	return &search.Request{
		Aggregations: map[string]types.Aggregations{
			"logs_over_time": {
				DateHistogram: &types.DateHistogramAggregation{
					Field:         lo.ToPtr("@timestamp"),
					FixedInterval: types.Duration(input.GetBucketSize()),
				},
			},
		},
		Query: in.elasticLogsQuery(input.Query, input.GetRange(), input.GetFacets(), &defaultOperator),
		Size:  lo.ToPtr(0),
	}
}

func (in *ElasticProvider) elasticLogsQuery(query string, timeRange *toolquery.TimeRange, inputFacets []*toolquery.LogsQueryFacet, defaultOperator *operator.Operator) *types.Query {
	query = strings.TrimSpace(query)
	facets := []types.Query{}
	if len(inputFacets) > 0 {
		facets = lo.Map(inputFacets, func(facet *toolquery.LogsQueryFacet, _ int) types.Query {
			return types.Query{
				Term: map[string]types.TermQuery{
					facet.GetName(): {
						Value: facet.GetValue(),
					},
				},
			}
		})
	}

	queryString := esdsl.NewQueryStringQuery(query).
		AllowLeadingWildcard(true).
		DefaultField("*").
		AnalyzeWildcard(true)
	if defaultOperator != nil {
		queryString.DefaultOperator(*defaultOperator)
	}

	return &types.Query{
		Bool: &types.BoolQuery{
			Must: []types.Query{
				{
					QueryString: queryString.QueryStringQueryCaster(),
				},
			},
			Filter: append([]types.Query{
				{Range: map[string]types.RangeQuery{
					"@timestamp": types.DateRangeQuery{
						Gte: lo.ToPtr(timeRange.GetStart().AsTime().UTC().Format(time.RFC3339Nano)),
						Lte: lo.ToPtr(timeRange.GetEnd().AsTime().UTC().Format(time.RFC3339Nano)),
					},
				}},
				{Exists: &types.ExistsQuery{Field: "message"}},
			}, facets...),
		},
	}
}

func (in *ElasticProvider) newElasticClient() (*elasticsearch.TypedClient, error) {
	if len(in.conn.GetUrl()) == 0 {
		return nil, fmt.Errorf("%w: missing url", ErrInvalidArgument)
	}

	if len(in.conn.GetUsername()) == 0 {
		return nil, fmt.Errorf("%w: missing username", ErrInvalidArgument)
	}

	if len(in.conn.GetPassword()) == 0 {
		return nil, fmt.Errorf("%w: missing password", ErrInvalidArgument)
	}

	return elasticsearch.NewTypedClient(elasticsearch.Config{
		Addresses:               []string{in.conn.GetUrl()},
		Username:                in.conn.GetUsername(),
		Password:                in.conn.GetPassword(),
		EnableCompatibilityMode: false,
	})
}
