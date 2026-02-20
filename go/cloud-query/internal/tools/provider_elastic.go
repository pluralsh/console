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
	"github.com/samber/lo"

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
		Request(in.toRequest(input)).
		Do(ctx)
	if err != nil {
		return nil, err
	}

	return in.toLogsQueryOutput(resp)
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
	query := strings.TrimSpace(input.Query)
	request := &search.Request{
		Query: &types.Query{
			Bool: &types.BoolQuery{
				Must: []types.Query{
					{
						QueryString: esdsl.NewQueryStringQuery(query).
							AllowLeadingWildcard(true).
							DefaultField("*").
							AnalyzeWildcard(true).
							QueryStringQueryCaster(),
					},
				},
				Filter: []types.Query{
					{Range: map[string]types.RangeQuery{
						"@timestamp": types.DateRangeQuery{
							Gte: lo.ToPtr(input.GetRange().GetStart().AsTime().UTC().Format(time.RFC3339Nano)),
							Lte: lo.ToPtr(input.GetRange().GetEnd().AsTime().UTC().Format(time.RFC3339Nano)),
						},
					}},
					{Exists: &types.ExistsQuery{Field: "message"}},
				},
			},
		},
	}

	if input.GetLimit() > 0 {
		request.Size = lo.ToPtr(int(input.GetLimit()))
	}

	return request
}

func (in *ElasticProvider) newElasticClient() (*elasticsearch.TypedClient, error) {
	if len(in.conn.GetUrl()) == 0 {
		return nil, fmt.Errorf("%w: missing url", ErrInvalidArgument)
	}

	if len(in.conn.GetApiKey()) == 0 {
		return nil, fmt.Errorf("%w: missing api key", ErrInvalidArgument)
	}

	return elasticsearch.NewTypedClient(elasticsearch.Config{
		Addresses: []string{in.conn.GetUrl()},
		APIKey:    in.conn.GetApiKey(),
	})
}
