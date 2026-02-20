package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
	"github.com/pluralsh/console/go/cloud-query/internal/tools/clients"
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

	client := clients.NewLokiClient(in.conn.GetUrl(), in.conn.GetToken(), in.conn.GetTenantId())
	defer client.Close()

	resp, err := client.Logs(
		ctx,
		input.Query,
		strconv.FormatInt(input.GetRange().GetStart().AsTime().UnixNano(), 10),
		strconv.FormatInt(input.GetRange().GetEnd().AsTime().UnixNano(), 10),
		strconv.Itoa(int(input.GetLimit())))
	if err != nil {
		return nil, err
	}

	return in.toLogsQueryOutput(resp)
}

func (in *LokiProvider) toLogsQueryOutput(resp *clients.LokiLogsResponse) (*toolquery.LogsQueryOutput, error) {
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
