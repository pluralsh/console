package client

import (
	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
)

func (c *client) UpsertConstraints(constraints []console.PolicyConstraintAttributes) (*console.UpsertPolicyConstraints, error) {
	return c.consoleClient.UpsertPolicyConstraints(c.ctx, lo.ToSlicePtr(constraints))
}
