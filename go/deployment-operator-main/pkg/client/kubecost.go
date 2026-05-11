package client

import console "github.com/pluralsh/console/go/client"

func (c *client) IngestClusterCost(attr console.CostIngestAttributes) (*console.IngestClusterCost, error) {
	return c.consoleClient.IngestClusterCost(c.ctx, attr)
}
