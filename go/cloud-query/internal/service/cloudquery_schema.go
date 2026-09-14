package service

import (
	"context"

	"github.com/samber/lo"

	"github.com/pluralsh/console/go/cloud-query/internal/connection"
	"github.com/pluralsh/console/go/cloud-query/internal/proto/cloudquery"
)

// Schema implements the cloudquery.CloudQueryServer interface
func (in *CloudQueryService) Schema(_ context.Context, input *cloudquery.SchemaInput) (*cloudquery.SchemaOutput, error) {
	table := input.GetTable()
	var out *cloudquery.SchemaOutput
	err := in.withProviderConnection(input.GetConnection(), func(c connection.Connection) error {
		result, err := c.Schema(table)
		if err != nil {
			return err
		}
		out = &cloudquery.SchemaOutput{Result: lo.ToSlicePtr(result)}
		return nil
	})
	return out, wrapInternal(err, "failed to execute schema query '%s': %v", table, err)
}
