package service

import (
	"context"

	"github.com/samber/lo"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/pluralsh/console/go/cloud-query/internal/connection"
	"github.com/pluralsh/console/go/cloud-query/internal/proto/cloudquery"
)

// Schema implements the cloudquery.CloudQueryServer interface
func (in *CloudQueryService) Schema(_ context.Context, input *cloudquery.SchemaInput) (*cloudquery.SchemaOutput, error) {
	c, _, err := in.createProviderConnection(input.GetConnection())
	if err != nil {
		return nil, err
	}

	return in.handleSchema(c, input.GetTable())
}

func (in *CloudQueryService) handleSchema(c connection.Connection, table string) (*cloudquery.SchemaOutput, error) {
	result, err := c.Schema(table)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to execute schema query '%s': %v", table, err)
	}

	return &cloudquery.SchemaOutput{Result: lo.ToSlicePtr(result)}, nil
}
