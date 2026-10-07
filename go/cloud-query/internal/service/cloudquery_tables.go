package service

import (
	"context"

	"github.com/pluralsh/console/go/cloud-query/internal/connection"
	"github.com/pluralsh/console/go/cloud-query/internal/proto/cloudquery"
)

// Tables implements the cloudquery.CloudQueryServer interface
func (in *CloudQueryService) Tables(_ context.Context, input *cloudquery.TablesInput) (*cloudquery.TablesOutput, error) {
	table := input.GetTable()
	var out *cloudquery.TablesOutput
	err := in.withProviderConnection(input.GetConnection(), func(c connection.Connection) error {
		result, err := c.Tables(table)
		if err != nil {
			return err
		}
		out = &cloudquery.TablesOutput{Result: result}
		return nil
	})
	return out, wrapInternal(err, "failed to execute schema query '%s': %v", table, err)
}
