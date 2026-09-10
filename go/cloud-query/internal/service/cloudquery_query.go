package service

import (
	"context"
	"encoding/json"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/cloud-query/internal/common"
	"github.com/pluralsh/console/go/cloud-query/internal/connection"
	"github.com/pluralsh/console/go/cloud-query/internal/log"
	"github.com/pluralsh/console/go/cloud-query/internal/proto/cloudquery"
)

// Query implements the cloudquery.CloudQueryServer interface
func (in *CloudQueryService) Query(ctx context.Context, input *cloudquery.QueryInput) (*cloudquery.QueryResult, error) {
	query := input.GetQuery()
	var out *cloudquery.QueryResult
	err := in.withProviderConnection(input.GetConnection(), func(c connection.Connection) error {
		result, err := in.handleQuery(ctx, c, query)
		if err != nil {
			return err
		}
		out = result
		return nil
	})
	return out, wrapInternal(err, "failed to execute query '%s': %v", query, err)
}

type queryConnection interface {
	QueryWithContext(context.Context, string, ...any) ([]string, [][]any, error)
}

func (in *CloudQueryService) handleQuery(ctx context.Context, c queryConnection, query string) (*cloudquery.QueryResult, error) {
	columns, rows, err := c.QueryWithContext(ctx, query)
	if err != nil {
		return nil, err
	}
	klog.V(log.LogLevelDebug).InfoS("found query results", "rows", len(rows))

	result := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		result = append(result, common.ToRow(columns, row))
	}

	resultJSON, err := json.Marshal(result)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to marshal query result for '%s': %v", query, err)
	}

	return &cloudquery.QueryResult{Result: string(resultJSON)}, nil
}
