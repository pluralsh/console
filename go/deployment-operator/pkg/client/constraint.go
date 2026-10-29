package client

import (
	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
)

func (c *client) UpsertConstraints(constraints []console.PolicyConstraintAttributes) (*console.UpsertPolicyConstraints, error) {
	var res countResponse
	err := c.upload("/ext/v1/constraints", func() any {
		return map[string]any{"constraints": toPolicyConstraints(constraints)}
	}, &res, func() error {
		legacy, err := c.consoleClient.UpsertPolicyConstraints(c.ctx, lo.ToSlicePtr(constraints))
		if err == nil && legacy.UpsertPolicyConstraints != nil {
			res.Count = *legacy.UpsertPolicyConstraints
		}
		return err
	})
	if err != nil {
		return nil, err
	}

	return &console.UpsertPolicyConstraints{UpsertPolicyConstraints: &res.Count}, nil
}
