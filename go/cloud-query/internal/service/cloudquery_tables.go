package service

import (
	"context"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/pluralsh/console/go/cloud-query/internal/connection"
	"github.com/pluralsh/console/go/cloud-query/internal/proto/cloudquery"
)

// Schema implements the cloudquery.CloudQueryServer interface
func (in *CloudQueryService) Tables(_ context.Context, input *cloudquery.TablesInput) (*cloudquery.TablesOutput, error) {
	c, _, err := in.createProviderConnection(input.GetConnection())
	if err != nil {
		return nil, err
	}

	return in.handleTables(c, input.GetTable())
}

func (in *CloudQueryService) handleTables(c connection.Connection, table string) (*cloudquery.TablesOutput, error) {
	result, err := c.Tables(table)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to execute schema query '%s': %v", table, err)
	}

	return &cloudquery.TablesOutput{Result: result}, nil
}
