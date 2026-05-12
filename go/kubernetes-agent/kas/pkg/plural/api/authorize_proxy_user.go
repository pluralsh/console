package api

import (
	"context"
	"fmt"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/plural"
	"github.com/pluralsh/console/go/polly/algorithms"
)

func AuthorizeProxyUser(ctx context.Context, token, clusterId, pluralURL string) (*AuthorizeProxyUserResponse, error) {
	client := plural.NewUnauthorized(pluralURL)
	resp, err := client.Console.TokenExchange(ctx, fmt.Sprintf("plrl:%s:%s", clusterId, token))
	if err != nil {
		return nil, err
	}

	return &AuthorizeProxyUserResponse{
		AccessAs: &AccessAsProxyAuthorization{
			AccessAs: &AccessAsProxyAuthorization_User{
				User: &AccessAsUserAuthorization{
					Groups: algorithms.Map(resp.TokenExchange.Groups, func(g *console.TokenExchange_TokenExchange_Groups) string {
						return g.Name
					}),
					Roles: algorithms.Map(resp.TokenExchange.BoundRoles, func(r *console.TokenExchange_TokenExchange_BoundRoles) string {
						return r.Name
					}),
				},
			},
		},
		User: &User{
			Id:       resp.TokenExchange.ID,
			Username: resp.TokenExchange.Email,
			Email:    resp.TokenExchange.Email,
		},
	}, nil
}
