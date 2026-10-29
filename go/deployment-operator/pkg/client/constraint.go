package client

import (
	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
)

func (c *client) UpsertConstraints(constraints []console.PolicyConstraintAttributes) (*console.UpsertPolicyConstraints, error) {
	count, err := c.upload("/ext/v1/constraints", func() any {
		return map[string]any{"constraints": toPolicyConstraints(constraints)}
	}, func() (*int64, error) {
		res, err := c.consoleClient.UpsertPolicyConstraints(c.ctx, lo.ToSlicePtr(constraints))
		if err != nil {
			return nil, err
		}
		return res.UpsertPolicyConstraints, nil
	})
	if err != nil {
		return nil, err
	}

	return &console.UpsertPolicyConstraints{UpsertPolicyConstraints: count}, nil
}
