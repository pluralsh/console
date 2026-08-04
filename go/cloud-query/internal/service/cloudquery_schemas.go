package service

import (
	"context"
	"strings"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/samber/lo"

	"github.com/pluralsh/console/go/cloud-query/internal/connection"
	"github.com/pluralsh/console/go/cloud-query/internal/proto/cloudquery"
)

// Schemas implements the cloudquery.CloudQueryServer interface.
func (in *CloudQueryService) Schemas(_ context.Context, input *cloudquery.SchemasInput) (*cloudquery.SchemaOutput, error) {
	if input == nil || len(input.GetTables()) == 0 {
		return nil, status.Error(codes.InvalidArgument, "at least one table is required")
	}

	tables := lo.UniqBy(
		lo.FilterMap(input.GetTables(), func(table string, _ int) (string, bool) {
			table = strings.TrimSpace(table)
			return table, table != ""
		}),
		func(table string) string { return table },
	)
	if len(tables) == 0 {
		return nil, status.Error(codes.InvalidArgument, "at least one table is required")
	}

	c, _, err := in.createProviderConnection(input.GetConnection())
	if err != nil {
		return nil, err
	}

	return in.handleSchemas(c, tables)
}

func (in *CloudQueryService) handleSchemas(c connection.Connection, tables []string) (*cloudquery.SchemaOutput, error) {
	result, err := c.Schemas(tables)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to execute schemas query for tables %q: %v", tables, err)
	}

	return &cloudquery.SchemaOutput{Result: lo.ToSlicePtr(result)}, nil
}
