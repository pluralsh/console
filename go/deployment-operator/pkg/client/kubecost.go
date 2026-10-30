package client

import (
	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
)

func (c *client) IngestClusterCost(attr console.CostIngestAttributes) (*console.IngestClusterCost, error) {
	err := c.upload("/ext/v1/costs", func() any { return toCostIngest(attr) }, nil, func() error {
		_, err := c.consoleClient.IngestClusterCost(c.ctx, attr)
		return err
	})
	if err != nil {
		return nil, err
	}

	return &console.IngestClusterCost{IngestClusterCost: lo.ToPtr(true)}, nil
}
