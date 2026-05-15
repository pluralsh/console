package client

import (
	console "github.com/pluralsh/console/go/client"
)

func (c *client) SaveUpgradeInsights(attributes []*console.UpgradeInsightAttributes, addons []*console.CloudAddonAttributes) (*console.SaveUpgradeInsights, error) {
	return c.consoleClient.SaveUpgradeInsights(c.ctx, attributes, addons)
}
