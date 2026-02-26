package api

import (
	"context"
	"fmt"
	"net/http"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/polly/algorithms"
	"go.uber.org/zap"

	"github.com/pluralsh/kubernetes-agent/pkg/plural"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/logz"
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

func CreateAuditLogInBackground(log *zap.Logger, agentId int64, r *http.Request, token, clusterId, pluralURL string) {
	go func() {
		log = log.With(logz.AgentId(agentId))

		client := plural.New(pluralURL, token)
		_, err := client.Console.AddClusterAuditLog(context.Background(), console.ClusterAuditAttributes{
			ClusterID: clusterId,
			Method:    r.Method,
			Path:      r.URL.Path,
		})

		if err != nil {
			log.Error("failed to create audit log", logz.Error(err))
		}
	}()
}
