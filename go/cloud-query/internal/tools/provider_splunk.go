package tools

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/pluralsh/console/go/cloud-query/internal/log"
	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
	"github.com/pluralsh/console/go/cloud-query/internal/tools/clients"
	"google.golang.org/protobuf/types/known/timestamppb"
	"k8s.io/klog/v2"
)

type SplunkProvider struct {
	conn *toolquery.SplunkConnection
}

type SplunkSearchResponse struct {
	Preview bool                       `json:"preview"`
	Result  SplunkSearchResponseResult `json:"result"`
}

type SplunkSearchResponseResult struct {
	Timestamp  string   `json:"_time"`
	Message    string   `json:"_raw"`
	Bkt        string   `json:"_bkt"`
	Cd         string   `json:"_cd"`
	IndexTime  string   `json:"_indextime"`
	Serial     string   `json:"_serial"`
	Si         []string `json:"_si"`
	Host       string   `json:"host"`
	Index      string   `json:"index"`
	LineCount  string   `json:"lineCount"`
	Source     string   `json:"source"`
	SourceType string   `json:"sourcetype"`
	Server     string   `json:"splunk_server"`
}

func NewSplunkProvider(conn *toolquery.SplunkConnection) LogsProvider {
	return &SplunkProvider{conn: conn}
}

func (in *SplunkProvider) Logs(ctx context.Context, input *toolquery.LogsQueryInput) (*toolquery.LogsQueryOutput, error) {
	if in.conn == nil {
		return nil, ErrInvalidArgument
	}
	if in.conn.GetUrl() == "" {
		return nil, fmt.Errorf("%w: missing url", ErrInvalidArgument)
	}
	if in.conn.GetToken() == "" && (in.conn.GetUsername() == "" || in.conn.GetPassword() == "") {
		return nil, fmt.Errorf("%w: missing auth (token or username/password required)", ErrInvalidArgument)
	}

	client := clients.NewSplunkClient(
		in.conn.GetUrl(),
		in.conn.GetToken(),
		in.conn.GetUsername(),
		in.conn.GetPassword(),
	)
	defer client.Close()

	body, err := client.ExportSearch(ctx, in.queryParams(input))
	if err != nil {
		return nil, err
	}

	return in.toLogsQueryOutput(body)
}

func (in *SplunkProvider) queryParams(input *toolquery.LogsQueryInput) url.Values {
	values := url.Values{
		"search":        {in.searchString(input.Query, input.GetLimit())},
		"earliest_time": {in.toSplunkTime(input.GetRange().GetStart().AsTime())},
		"latest_time":   {in.toSplunkTime(input.GetRange().GetEnd().AsTime())},
		"output_mode":   {"json"},
	}

	return values
}

func (in *SplunkProvider) searchString(query string, limit int32) string {
	trimmed := strings.TrimSpace(query)
	if strings.HasPrefix(trimmed, "search ") {
		if limit > 0 {
			return fmt.Sprintf("%s | head %d", trimmed, limit)
		}
		return trimmed
	}

	base := "search " + trimmed
	if limit > 0 {
		return fmt.Sprintf("%s | head %d", base, limit)
	}
	return base
}

func (in *SplunkProvider) toSplunkTime(ts time.Time) string {
	secs := float64(ts.UTC().UnixNano()) / float64(time.Second)
	return strconv.FormatFloat(secs, 'f', 6, 64)
}

func (in *SplunkProvider) toLogsQueryOutput(responseBody string) (*toolquery.LogsQueryOutput, error) {
	logs := make([]*toolquery.LogEntry, 0)
	scanner := bufio.NewScanner(strings.NewReader(responseBody))
	scanner.Buffer(make([]byte, bufio.MaxScanTokenSize), 10*1024*1024) // 10MB

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		var item SplunkSearchResponse
		if err := json.Unmarshal([]byte(line), &item); err != nil {
			continue
		}

		if item.Preview || item.Result.Message == "" || item.Result.Timestamp == "" {
			continue
		}

		entry, err := in.toLogEntry(item.Result)
		if err != nil {
			klog.Errorf("error parsing splunk log: %v", err)
			continue
		}

		logs = append(logs, entry)
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	return &toolquery.LogsQueryOutput{Logs: logs}, nil
}

func (in *SplunkProvider) toLogEntry(result SplunkSearchResponseResult) (*toolquery.LogEntry, error) {
	timestamp, err := in.parseTime(result.Timestamp)
	if err != nil {
		return nil, err
	}

	return &toolquery.LogEntry{
		Timestamp: timestamppb.New(timestamp),
		Message:   result.Message,
		Labels:    in.toLabels(result),
	}, nil
}

func (in *SplunkProvider) toLabels(result SplunkSearchResponseResult) map[string]string {
	labels := map[string]string{}

	labels["_bkt"] = result.Bkt
	labels["_cd"] = result.Cd
	labels["_indextime"] = result.IndexTime
	labels["_serial"] = result.Serial
	labels["_si"] = strings.Join(result.Si, ",")
	labels["host"] = result.Host
	labels["index"] = result.Index
	labels["lineCount"] = result.LineCount
	labels["source"] = result.Source
	labels["sourcetype"] = result.SourceType
	labels["splunk_server"] = result.Server

	return labels
}

func (in *SplunkProvider) parseTime(value any) (time.Time, error) {
	raw := strings.TrimSpace(toString(value))
	if raw == "" {
		klog.V(log.LogLevelInfo).InfoS("empty splunk log timestamp value, defaulting to zero time")
		return time.Time{}, nil
	}

	if unixFloat, err := strconv.ParseFloat(raw, 64); err == nil {
		secs := int64(unixFloat)
		nanos := int64((unixFloat - float64(secs)) * float64(time.Second))
		return time.Unix(secs, nanos).UTC(), nil
	}

	formats := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02T15:04:05.000-07:00",
		"2006-01-02 15:04:05.000 MST",
		"2006-01-02 15:04:05 MST",
	}
	for _, format := range formats {
		if ts, err := time.Parse(format, raw); err == nil {
			return ts.UTC(), nil
		}
	}

	return time.Time{}, fmt.Errorf("%w: unsupported _time format %q", ErrInvalidArgument, raw)
}

func toString(value any) string {
	switch typed := value.(type) {
	case nil:
		return ""
	case string:
		return typed
	case json.Number:
		return typed.String()
	default:
		return fmt.Sprint(value)
	}
}
