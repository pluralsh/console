package tools

import (
	"context"
	"fmt"
	"slices"
	"sort"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/credentials/stscreds"
	"github.com/aws/aws-sdk-go-v2/service/cloudwatch"
	cloudwatchtypes "github.com/aws/aws-sdk-go-v2/service/cloudwatch/types"
	"github.com/aws/aws-sdk-go-v2/service/cloudwatchlogs"
	cloudwatchlogstypes "github.com/aws/aws-sdk-go-v2/service/cloudwatchlogs/types"
	"github.com/aws/aws-sdk-go-v2/service/sts"
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

type CloudwatchProvider struct {
	conn *toolquery.CloudwatchConnection
}

func NewCloudwatchProvider(conn *toolquery.CloudwatchConnection) *CloudwatchProvider {
	return &CloudwatchProvider{conn: conn}
}

func (in *CloudwatchProvider) Metrics(ctx context.Context, input *toolquery.MetricsQueryInput) (*toolquery.MetricsQueryOutput, error) {
	if in.conn == nil {
		return nil, fmt.Errorf("%w: cloudwatch connection is required", ErrInvalidArgument)
	}
	if input == nil || input.GetQuery() == "" {
		return nil, fmt.Errorf("%w: query is required", ErrInvalidArgument)
	}

	cfg, err := in.newAWSConfig(ctx)
	if err != nil {
		return nil, err
	}

	client := cloudwatch.NewFromConfig(cfg)
	request := &cloudwatch.GetMetricDataInput{
		StartTime: aws.Time(input.GetRange().GetStart().AsTime()),
		EndTime:   aws.Time(input.GetRange().GetEnd().AsTime()),
		MetricDataQueries: []cloudwatchtypes.MetricDataQuery{
			{
				Id:         aws.String("q1"),
				Expression: aws.String(input.GetQuery()),
				ReturnData: aws.Bool(true),
			},
		},
	}

	if step := input.GetStep(); step != "" {
		duration, err := time.ParseDuration(step)
		if err != nil {
			return nil, fmt.Errorf("%w: invalid step duration: %s", ErrInvalidArgument, step)
		}
		if duration > 0 {
			request.MetricDataQueries[0].Period = aws.Int32(int32(duration.Seconds()))
		}
	}

	points := make([]*toolquery.MetricPoint, 0)
	paginator := cloudwatch.NewGetMetricDataPaginator(client, request)
	for paginator.HasMorePages() {
		page, err := paginator.NextPage(ctx)
		if err != nil {
			return nil, err
		}

		for _, result := range page.MetricDataResults {
			name := aws.ToString(result.Label)
			if name == "" {
				name = aws.ToString(result.Id)
			}

			length := min(len(result.Values), len(result.Timestamps))
			for i := range length {
				labels := map[string]string{}
				if id := aws.ToString(result.Id); id != "" {
					labels["id"] = id
				}
				if status := string(result.StatusCode); status != "" {
					labels["status"] = status
				}

				points = append(points, &toolquery.MetricPoint{
					Timestamp: timestamppb.New(result.Timestamps[i].UTC()),
					Name:      name,
					Value:     result.Values[i],
					Labels:    labels,
				})
			}
		}
	}

	return &toolquery.MetricsQueryOutput{Metrics: points}, nil
}

func (in *CloudwatchProvider) MetricsSearch(ctx context.Context, searchInput *toolquery.MetricsSearchInput) (*toolquery.MetricsSearchOutput, error) {
	if in.conn == nil {
		return nil, fmt.Errorf("%w: cloudwatch connection is required", ErrInvalidArgument)
	}

	cfg, err := in.newAWSConfig(ctx)
	if err != nil {
		return nil, err
	}

	client := cloudwatch.NewFromConfig(cfg)
	listInput := &cloudwatch.ListMetricsInput{
		RecentlyActive: cloudwatchtypes.RecentlyActivePt3h,
	}

	const defaultLimit = 100
	const maxPages = 6

	limit := defaultLimit
	if requested := searchInput.GetLimit(); requested > 0 {
		limit = min(int(requested), 500)
	}

	query := strings.TrimSpace(strings.ToLower(searchInput.GetQuery()))
	seen := make(map[string]struct{}, limit)
	results := make([]*toolquery.MetricsSearchResult, 0, limit)
	paginator := cloudwatch.NewListMetricsPaginator(client, listInput)

	for pageNum := 0; paginator.HasMorePages() && pageNum < maxPages && len(results) < limit; pageNum++ {
		page, err := paginator.NextPage(ctx)
		if err != nil {
			return nil, err
		}

		for _, metric := range page.Metrics {
			if !cloudwatchMetricMatchesQuery(metric, query) {
				continue
			}

			name := cloudwatchMetricResultName(metric)
			if name == "" {
				continue
			}
			if _, exists := seen[name]; exists {
				continue
			}

			seen[name] = struct{}{}
			results = append(results, &toolquery.MetricsSearchResult{Name: name})
			if len(results) >= limit {
				break
			}
		}
	}

	return &toolquery.MetricsSearchOutput{Metrics: results}, nil
}

func (in *CloudwatchProvider) Logs(ctx context.Context, input *toolquery.LogsQueryInput) (*toolquery.LogsQueryOutput, error) {
	if in.conn == nil {
		return nil, fmt.Errorf("%w: cloudwatch connection is required", ErrInvalidArgument)
	}
	if input == nil || input.GetQuery() == "" {
		return nil, fmt.Errorf("%w: query is required", ErrInvalidArgument)
	}

	cfg, err := in.newAWSConfig(ctx)
	if err != nil {
		return nil, err
	}

	query := cloudwatchLogsQueryWithFacets(input.GetQuery(), input.GetFacets())
	startQueryInput := &cloudwatchlogs.StartQueryInput{
		StartTime:   aws.Int64(input.GetRange().GetStart().AsTime().Unix()),
		EndTime:     aws.Int64(input.GetRange().GetEnd().AsTime().Unix()),
		QueryString: aws.String(query),
	}
	if input.GetLimit() > 0 {
		startQueryInput.Limit = aws.Int32(input.GetLimit())
	}

	logGroupNames := in.logGroupNames()
	if len(logGroupNames) > 0 {
		startQueryInput.LogGroupNames = logGroupNames
	} else if !containsCloudwatchSource(query) {
		return nil, fmt.Errorf("%w: either cloudwatch.log_group_names must be set or query must include SOURCE", ErrInvalidArgument)
	}

	client := cloudwatchlogs.NewFromConfig(cfg)
	startOutput, err := client.StartQuery(ctx, startQueryInput)
	if err != nil {
		return nil, err
	}
	if startOutput.QueryId == nil || *startOutput.QueryId == "" {
		return nil, fmt.Errorf("cloudwatch logs query did not return query id")
	}

	results, err := in.waitForQueryResults(ctx, client, *startOutput.QueryId)
	if err != nil {
		return nil, err
	}

	return &toolquery.LogsQueryOutput{Logs: in.toLogs(results)}, nil
}

func (in *CloudwatchProvider) newAWSConfig(ctx context.Context) (aws.Config, error) {
	if in.conn.GetRegion() == "" {
		return aws.Config{}, fmt.Errorf("%w: region is required", ErrInvalidArgument)
	}

	accessKeyID := strings.TrimSpace(in.conn.GetAccessKeyId())
	secretAccessKey := strings.TrimSpace(in.conn.GetSecretAccessKey())
	if (accessKeyID == "") != (secretAccessKey == "") {
		return aws.Config{}, fmt.Errorf("%w: access_key_id and secret_access_key must be provided together", ErrInvalidArgument)
	}

	loadOptions := []func(*config.LoadOptions) error{
		config.WithRegion(in.conn.GetRegion()),
	}
	if accessKeyID != "" {
		loadOptions = append(loadOptions, config.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(accessKeyID, secretAccessKey, in.conn.GetSessionToken()),
		))
	}

	cfg, err := config.LoadDefaultConfig(ctx, loadOptions...)
	if err != nil {
		return aws.Config{}, err
	}

	if roleARN := strings.TrimSpace(in.conn.GetRoleArn()); roleARN != "" {
		assumeRoleProvider := stscreds.NewAssumeRoleProvider(sts.NewFromConfig(cfg), roleARN, func(options *stscreds.AssumeRoleOptions) {
			if externalID := strings.TrimSpace(in.conn.GetExternalId()); externalID != "" {
				options.ExternalID = aws.String(externalID)
			}
			if sessionName := strings.TrimSpace(in.conn.GetRoleSessionName()); sessionName != "" {
				options.RoleSessionName = sessionName
			}
		})
		cfg.Credentials = aws.NewCredentialsCache(assumeRoleProvider)
	}

	return cfg, nil
}

func (in *CloudwatchProvider) waitForQueryResults(ctx context.Context, client *cloudwatchlogs.Client, queryID string) ([]map[string]string, error) {
	waitCtx := ctx
	if _, ok := waitCtx.Deadline(); !ok {
		var cancel context.CancelFunc
		waitCtx, cancel = context.WithTimeout(ctx, 2*time.Minute)
		defer cancel()
	}

	ticker := time.NewTicker(750 * time.Millisecond)
	defer ticker.Stop()

	for {
		output, err := client.GetQueryResults(waitCtx, &cloudwatchlogs.GetQueryResultsInput{
			QueryId: aws.String(queryID),
		})
		if err != nil {
			return nil, err
		}

		switch output.Status {
		case cloudwatchlogstypes.QueryStatusComplete:
			rows := make([]map[string]string, 0, len(output.Results))
			for _, record := range output.Results {
				row := make(map[string]string, len(record))
				for _, item := range record {
					field := strings.TrimSpace(aws.ToString(item.Field))
					if field == "" {
						continue
					}
					row[field] = aws.ToString(item.Value)
				}
				rows = append(rows, row)
			}
			return rows, nil
		case cloudwatchlogstypes.QueryStatusFailed, cloudwatchlogstypes.QueryStatusCancelled, cloudwatchlogstypes.QueryStatusTimeout, cloudwatchlogstypes.QueryStatusUnknown:
			return nil, fmt.Errorf("cloudwatch logs query failed with status=%s", output.Status)
		case cloudwatchlogstypes.QueryStatusScheduled, cloudwatchlogstypes.QueryStatusRunning:
			select {
			case <-waitCtx.Done():
				return nil, waitCtx.Err()
			case <-ticker.C:
			}
		default:
			return nil, fmt.Errorf("unexpected cloudwatch logs query status=%s", output.Status)
		}
	}
}

func (in *CloudwatchProvider) toLogs(rows []map[string]string) []*toolquery.LogEntry {
	logs := make([]*toolquery.LogEntry, 0, len(rows))

	for _, row := range rows {
		timestamp := parseCloudwatchTimestamp(row)
		message := row["@message"]
		if message == "" {
			message = row["message"]
		}
		if message == "" {
			message = cloudwatchFieldsMessage(row)
		}

		labels := make(map[string]string, len(row))
		for key, value := range row {
			if value == "" || key == "@timestamp" || key == "timestamp" || key == "@message" || key == "message" {
				continue
			}
			labels[key] = value
		}

		logs = append(logs, &toolquery.LogEntry{
			Timestamp: timestamppb.New(timestamp),
			Message:   message,
			Labels:    labels,
		})
	}

	return logs
}

func (in *CloudwatchProvider) logGroupNames() []string {
	groups := make([]string, 0, len(in.conn.GetLogGroupNames()))
	for _, group := range in.conn.GetLogGroupNames() {
		trimmed := strings.TrimSpace(group)
		if trimmed == "" || slices.Contains(groups, trimmed) {
			continue
		}
		groups = append(groups, trimmed)
	}
	return groups
}

func containsCloudwatchSource(query string) bool {
	return strings.Contains(strings.ToUpper(query), "SOURCE")
}

func cloudwatchLogsQueryWithFacets(base string, facets []*toolquery.LogsQueryFacet) string {
	conditions := make([]string, 0, len(facets))
	for _, facet := range facets {
		if facet == nil {
			continue
		}

		name := strings.TrimSpace(facet.GetName())
		value := strings.TrimSpace(facet.GetValue())
		if name == "" || value == "" {
			continue
		}
		if !strings.HasPrefix(name, "@") {
			name = fmt.Sprintf("`%s`", strings.ReplaceAll(name, "`", ""))
		}

		escaped := strings.ReplaceAll(value, "\\", "\\\\")
		escaped = strings.ReplaceAll(escaped, "\"", "\\\"")
		conditions = append(conditions, fmt.Sprintf("%s = \"%s\"", name, escaped))
	}
	if len(conditions) == 0 {
		return base
	}

	return fmt.Sprintf("%s | filter %s", base, strings.Join(conditions, " and "))
}

func parseCloudwatchTimestamp(fields map[string]string) time.Time {
	raw := strings.TrimSpace(fields["@timestamp"])
	if raw == "" {
		raw = strings.TrimSpace(fields["timestamp"])
	}
	if raw == "" {
		return time.Now().UTC()
	}

	layouts := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02 15:04:05.000",
		"2006-01-02 15:04:05",
	}
	for _, layout := range layouts {
		if parsed, err := time.Parse(layout, raw); err == nil {
			return parsed.UTC()
		}
	}

	return time.Now().UTC()
}

func cloudwatchFieldsMessage(fields map[string]string) string {
	if len(fields) == 0 {
		return ""
	}

	keys := make([]string, 0, len(fields))
	for key, value := range fields {
		if value == "" {
			continue
		}
		keys = append(keys, key)
	}
	sort.Strings(keys)

	parts := make([]string, 0, len(keys))
	for _, key := range keys {
		parts = append(parts, fmt.Sprintf("%s=%s", key, fields[key]))
	}

	return strings.Join(parts, " ")
}

func cloudwatchMetricMatchesQuery(metric cloudwatchtypes.Metric, query string) bool {
	if query == "" {
		return true
	}

	namespace := strings.ToLower(aws.ToString(metric.Namespace))
	name := strings.ToLower(aws.ToString(metric.MetricName))
	if strings.Contains(namespace, query) || strings.Contains(name, query) {
		return true
	}

	for _, dimension := range metric.Dimensions {
		if strings.Contains(strings.ToLower(aws.ToString(dimension.Name)), query) {
			return true
		}
	}

	return false
}

func cloudwatchMetricResultName(metric cloudwatchtypes.Metric) string {
	namespace := strings.TrimSpace(aws.ToString(metric.Namespace))
	name := strings.TrimSpace(aws.ToString(metric.MetricName))

	switch {
	case namespace != "" && name != "":
		return namespace + "/" + name
	case name != "":
		return name
	default:
		return ""
	}
}
