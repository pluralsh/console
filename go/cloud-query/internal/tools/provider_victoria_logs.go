package tools

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
	"github.com/pluralsh/console/go/cloud-query/internal/tools/client"
)

type VictoriaLogsProvider struct {
	conn *toolquery.VictoriaLogsConnection
}

type victoriaLogsHitsResponse struct {
	Hits []struct {
		Timestamps []string `json:"timestamps"`
		Values     []int64  `json:"values"`
	} `json:"hits"`
}

func NewVictoriaLogsProvider(conn *toolquery.VictoriaLogsConnection) LogsProvider {
	return &VictoriaLogsProvider{conn: conn}
}

func (in *VictoriaLogsProvider) Logs(ctx context.Context, input *toolquery.LogsQueryInput) (*toolquery.LogsQueryOutput, error) {
	if in.conn == nil {
		return nil, ErrInvalidArgument
	}
	if input == nil {
		return nil, ErrInvalidArgument
	}

	vlClient := client.NewVictoriaLogsClient(
		in.conn.GetUrl(),
		in.conn.GetToken(),
		in.conn.GetUsername(),
		in.conn.GetPassword(),
		in.conn.GetAccountId(),
		in.conn.GetProjectId(),
	)
	defer vlClient.Close()

	body, err := vlClient.Query(ctx, in.queryParams(defaultLogQuery(input.Query, "*"), input.GetFacets(), input.GetLimit(), input.GetRange(), toolquery.LogQueryOperator_LOG_QUERY_OPERATOR_AND))
	if err != nil {
		return nil, err
	}

	return in.toLogsQueryOutput(body)
}

func (in *VictoriaLogsProvider) LogAggregate(ctx context.Context, input *toolquery.LogAggregateInput) (*toolquery.LogAggregateOutput, error) {
	if in.conn == nil {
		return nil, ErrInvalidArgument
	}
	if input == nil {
		return nil, ErrInvalidArgument
	}

	vlClient := client.NewVictoriaLogsClient(
		in.conn.GetUrl(),
		in.conn.GetToken(),
		in.conn.GetUsername(),
		in.conn.GetPassword(),
		in.conn.GetAccountId(),
		in.conn.GetProjectId(),
	)
	defer vlClient.Close()

	params := in.rangeParams(mergeVictoriaLogsQueryWithFacets(defaultLogQuery(input.Query, "*"), input.GetFacets(), input.GetOperator()), input.GetRange())
	params.Set("step", input.GetBucketSize())

	body, err := vlClient.Hits(ctx, params)
	if err != nil {
		return nil, err
	}

	var resp victoriaLogsHitsResponse
	if err := json.Unmarshal([]byte(body), &resp); err != nil {
		return nil, fmt.Errorf("decode victoria logs hits: %w", err)
	}

	counts := map[int64]int64{}
	for _, hit := range resp.Hits {
		n := len(hit.Timestamps)
		if len(hit.Values) < n {
			n = len(hit.Values)
		}
		for i := 0; i < n; i++ {
			ts, err := parseVictoriaLogsTime(hit.Timestamps[i])
			if err != nil {
				return nil, err
			}
			counts[ts.UnixNano()] += hit.Values[i]
		}
	}

	timestamps := make([]int64, 0, len(counts))
	for timestamp := range counts {
		timestamps = append(timestamps, timestamp)
	}
	sort.Slice(timestamps, func(i, j int) bool { return timestamps[i] < timestamps[j] })

	buckets := make([]*toolquery.LogAggregateBucket, 0, len(timestamps))
	for _, timestamp := range timestamps {
		buckets = append(buckets, &toolquery.LogAggregateBucket{
			Timestamp: timestamppb.New(time.Unix(0, timestamp)),
			Count:     counts[timestamp],
		})
	}

	return &toolquery.LogAggregateOutput{Buckets: buckets}, nil
}

func (in *VictoriaLogsProvider) queryParams(query string, facets []*toolquery.LogsQueryFacet, limit int32, timeRange *toolquery.TimeRange, operator toolquery.LogQueryOperator) url.Values {
	params := in.rangeParams(mergeVictoriaLogsQueryWithFacets(query, facets, operator), timeRange)
	if limit > 0 {
		params.Set("limit", strconv.Itoa(int(limit)))
	}
	return params
}

func (in *VictoriaLogsProvider) rangeParams(query string, timeRange *toolquery.TimeRange) url.Values {
	params := url.Values{
		"query": {query},
	}
	if timeRange != nil && timeRange.GetStart() != nil {
		params.Set("start", timeRange.GetStart().AsTime().UTC().Format(time.RFC3339Nano))
	}
	if timeRange != nil && timeRange.GetEnd() != nil {
		params.Set("end", timeRange.GetEnd().AsTime().UTC().Format(time.RFC3339Nano))
	}
	return params
}

func (in *VictoriaLogsProvider) toLogsQueryOutput(body string) (*toolquery.LogsQueryOutput, error) {
	logs := make([]*toolquery.LogEntry, 0)
	scanner := bufio.NewScanner(strings.NewReader(body))
	scanner.Buffer(make([]byte, 0, 64*1024), 16*1024*1024)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		var entry map[string]any
		if err := json.Unmarshal([]byte(line), &entry); err != nil {
			return nil, fmt.Errorf("decode victoria logs line: %w", err)
		}

		message, _ := entry["_msg"].(string)
		rawTime, _ := entry["_time"].(string)
		ts, err := parseVictoriaLogsTime(rawTime)
		if err != nil {
			return nil, err
		}

		logs = append(logs, &toolquery.LogEntry{
			Timestamp: timestamppb.New(ts),
			Message:   message,
			Labels:    victoriaLogsLabels(entry),
		})
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}

	return &toolquery.LogsQueryOutput{Logs: logs}, nil
}

func victoriaLogsLabels(entry map[string]any) map[string]string {
	labels := make(map[string]string, len(entry))
	for key, value := range entry {
		if key == "_msg" || key == "_time" {
			continue
		}
		labels[key] = victoriaLogsStringify(value)
	}
	return labels
}

func victoriaLogsStringify(value any) string {
	switch typed := value.(type) {
	case nil:
		return ""
	case string:
		return typed
	case json.Number:
		return typed.String()
	default:
		encoded, err := json.Marshal(typed)
		if err != nil {
			return fmt.Sprint(typed)
		}
		return string(encoded)
	}
}

func parseVictoriaLogsTime(value string) (time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return time.Time{}, fmt.Errorf("missing victoria logs timestamp")
	}
	if ts, err := time.Parse(time.RFC3339Nano, value); err == nil {
		return ts, nil
	}
	if ts, err := time.Parse(time.RFC3339, value); err == nil {
		return ts, nil
	}
	if ns, err := strconv.ParseInt(value, 10, 64); err == nil {
		return time.Unix(0, ns), nil
	}
	return time.Time{}, fmt.Errorf("unsupported victoria logs timestamp %q", value)
}
