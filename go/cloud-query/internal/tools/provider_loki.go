package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
	"github.com/pluralsh/console/go/cloud-query/internal/tools/client"
)

type LokiProvider struct {
	conn *toolquery.LokiConnection
}

func NewLokiProvider(conn *toolquery.LokiConnection) LogsProvider {
	return &LokiProvider{conn: conn}
}

func (in *LokiProvider) Logs(ctx context.Context, input *toolquery.LogsQueryInput) (*toolquery.LogsQueryOutput, error) {
	if in.conn == nil {
		return nil, ErrInvalidArgument
	}
	if input == nil || input.Query == "" {
		return nil, ErrInvalidArgument
	}

	client := client.NewLokiClient(in.conn.GetUrl(), in.conn.GetToken(), in.conn.GetUsername(), in.conn.GetPassword(), in.conn.GetTenantId())
	defer client.Close()

	resp, err := client.Logs(
		ctx,
		mergeLokiQueryWithFacets(input.Query, input.GetFacets()),
		strconv.FormatInt(input.GetRange().GetStart().AsTime().UnixNano(), 10),
		strconv.FormatInt(input.GetRange().GetEnd().AsTime().UnixNano(), 10),
		strconv.Itoa(int(input.GetLimit())))
	if err != nil {
		return nil, err
	}

	return in.toLogsQueryOutput(resp)
}

func (in *LokiProvider) LogAggregate(ctx context.Context, input *toolquery.LogAggregateInput) (*toolquery.LogAggregateOutput, error) {
	if in.conn == nil {
		return nil, ErrInvalidArgument
	}
	if input == nil || input.Query == "" {
		return nil, ErrInvalidArgument
	}

	lokiClient := client.NewLokiClient(in.conn.GetUrl(), in.conn.GetToken(), in.conn.GetUsername(), in.conn.GetPassword(), in.conn.GetTenantId())
	defer lokiClient.Close()

	query := mergeLokiQueryWithFacets(input.Query, input.GetFacets())
	resp, err := lokiClient.LogAggregate(
		ctx,
		fmt.Sprintf("sum(count_over_time(%s[%s]))", query, input.GetBucketSize()),
		strconv.FormatInt(input.GetRange().GetStart().AsTime().UnixNano(), 10),
		strconv.FormatInt(input.GetRange().GetEnd().AsTime().UnixNano(), 10),
		input.GetBucketSize())
	if err != nil {
		return nil, err
	}

	counts := map[int64]int64{}
	for _, result := range resp.Data.Result {
		for _, value := range result.Values {
			if len(value) < 2 {
				continue
			}
			timestamp, err := lokiAggregateTimestamp(value[0])
			if err != nil {
				return nil, err
			}
			count, err := strconv.ParseFloat(fmt.Sprint(value[1]), 64)
			if err != nil {
				return nil, err
			}
			counts[timestamp.UnixNano()] += int64(count)
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

func lokiAggregateTimestamp(value any) (time.Time, error) {
	seconds, err := strconv.ParseFloat(fmt.Sprint(value), 64)
	if err != nil {
		return time.Time{}, err
	}
	whole := int64(seconds)
	return time.Unix(whole, int64((seconds-float64(whole))*float64(time.Second))), nil
}

func (in *LokiProvider) toLogsQueryOutput(resp *client.LokiLogsResponse) (*toolquery.LogsQueryOutput, error) {
	logs := make([]*toolquery.LogEntry, 0)

	for _, result := range resp.Data.Result {
		labels := result.Stream
		for _, value := range result.Values {
			if len(value) < 2 {
				continue
			}
			ts, err := in.parseTimestamp(value[0])
			if err != nil {
				return nil, err
			}

			message := fmt.Sprint(value[1])
			logs = append(logs, &toolquery.LogEntry{
				Timestamp: ts,
				Message:   message,
				Labels:    labels,
			})
		}
	}

	return &toolquery.LogsQueryOutput{Logs: logs}, nil
}

func (in *LokiProvider) parseTimestamp(value any) (*timestamppb.Timestamp, error) {
	switch ts := value.(type) {
	case json.Number:
		ns, err := ts.Int64()
		if err != nil {
			return nil, err
		}
		return timestamppb.New(time.Unix(0, ns)), nil
	case string:
		ns, err := strconv.ParseInt(ts, 10, 64)
		if err != nil {
			return nil, err
		}
		return timestamppb.New(time.Unix(0, ns)), nil
	default:
		return nil, fmt.Errorf("unsupported timestamp type %T", value)
	}
}
