package api

import (
	"context"
	"net/http"

	gitlab2 "github.com/pluralsh/kubernetes-agent/pkg/gitlab"
)

const (
	AuthorizeProxyUserApiPath = "/api/v4/internal/kubernetes/authorize_proxy_user"
)

func AuthorizeProxyUser(ctx context.Context, client gitlab2.ClientInterface, agentId int64, accessType, accessKey, csrfToken string, opts ...gitlab2.DoOption) (*AuthorizeProxyUserResponse, error) {
	auth := &AuthorizeProxyUserResponse{}
	err := client.Do(ctx,
		joinOpts(opts,
			gitlab2.WithMethod(http.MethodPost),
			gitlab2.WithPath(AuthorizeProxyUserApiPath),
			gitlab2.WithJWT(true),
			gitlab2.WithProtoJsonRequestBody(&AuthorizeProxyUserRequest{
				AgentId:    agentId,
				AccessType: accessType,
				AccessKey:  accessKey,
				CsrfToken:  csrfToken,
			}),
			gitlab2.WithResponseHandler(gitlab2.ProtoJsonResponseHandlerWithStructuredErrReason(auth)),
		)...,
	)
	if err != nil {
		return nil, err
	}
	return auth, nil
}
