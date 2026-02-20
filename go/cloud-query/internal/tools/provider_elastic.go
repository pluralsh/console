package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/elastic/go-elasticsearch/v9"
	"github.com/elastic/go-elasticsearch/v9/typedapi/core/search"
	"github.com/elastic/go-elasticsearch/v9/typedapi/esdsl"
	"github.com/elastic/go-elasticsearch/v9/typedapi/types"
	"github.com/samber/lo"
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
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

		var source map[string]any
		if err := json.Unmarshal(hit.Source_, &source); err != nil {
			return nil, err
		}

		labels, message, timestamp, err := in.parseSource(source)
		if err != nil {
			return nil, err
		}
		logs = append(logs, &toolquery.LogEntry{
			Timestamp: timestamp,
			Message:   message,
			Labels:    labels,
		})
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
							AnalyzeWildcard(true).QueryStringQueryCaster(),
					},
				},
				Filter: []types.Query{
					{Range: map[string]types.RangeQuery{
						"@timestamp": types.DateRangeQuery{
							Gte: lo.ToPtr(input.GetRange().GetStart().String()),
							Lte: lo.ToPtr(input.GetRange().GetEnd().String()),
						},
					}},
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

func (in *ElasticProvider) parseSource(source map[string]any) (map[string]string, string, *timestamppb.Timestamp, error) {
	labels := make(map[string]string, len(source))
	var message string
	var timestamp time.Time

	for key, value := range source {
		if key == "@timestamp" || key == "timestamp" || key == "time" {
			parsed, err := in.parseTimestamp(value)
			if err == nil {
				timestamp = parsed
			}
			continue
		}

		switch strings.ToLower(key) {
		case "message", "msg", "log", "event", "log.original":
			message = fmt.Sprint(value)
		default:
			labels[key] = fmt.Sprint(value)
		}
	}

	if message == "" {
		payload, _ := json.Marshal(source)
		message = string(payload)
	}

	if timestamp.IsZero() {
		timestamp = time.Now()
	}

	sortedLabels := make(map[string]string, len(labels))
	keys := make([]string, 0, len(labels))
	for k := range labels {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, key := range keys {
		sortedLabels[key] = labels[key]
	}

	return sortedLabels, message, timestamppb.New(timestamp), nil
}

func (in *ElasticProvider) parseTimestamp(value any) (time.Time, error) {
	switch ts := value.(type) {
	case string:
		parsed, err := time.Parse(time.RFC3339Nano, ts)
		if err != nil {
			return time.Time{}, err
		}
		return parsed, nil
	case json.Number:
		f, err := ts.Float64()
		if err != nil {
			return time.Time{}, err
		}
		return time.Unix(0, int64(f*float64(time.Millisecond))), nil
	case float64:
		return time.Unix(0, int64(ts*float64(time.Millisecond))), nil
	default:
		return time.Time{}, fmt.Errorf("unsupported timestamp type %T", value)
	}
}
