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
func (in *CloudQueryService) Query(_ context.Context, input *cloudquery.QueryInput) (*cloudquery.QueryResult, error) {
	c, _, err := in.createProviderConnection(input.GetConnection())
	if err != nil {
		return nil, err
	}

	return in.handleQuery(c, input.GetQuery())
}

func (in *CloudQueryService) handleQuery(c connection.Connection, query string) (*cloudquery.QueryResult, error) {
	columns, rows, err := c.Query(query)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to execute query '%s': %v", query, err)
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
