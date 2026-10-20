package client

import (
	"context"
	"errors"
	"testing"

	"github.com/gqlgo/gqlgenc/clientv2"
	console "github.com/pluralsh/console/go/client"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/vektah/gqlparser/v2/gqlerror"
	apierrors "k8s.io/apimachinery/pkg/api/errors"

	internalerror "github.com/pluralsh/console/go/deployment-operator/internal/errors"
)

type agentRunCredentialsConsoleClient struct {
	console.ConsoleClient
	response *console.GetAgentRunCredentials
	err      error
}

func (c *agentRunCredentialsConsoleClient) GetAgentRunCredentials(_ context.Context, _ string, _ ...clientv2.RequestInterceptor) (*console.GetAgentRunCredentials, error) {
	return c.response, c.err
}

func TestGetAgentRunCredentials(t *testing.T) {
	credentials := &console.AgentRunCredentialsFragment{ScmCreds: &console.ScmCredentialFragment{Token: "scm-token"}}
	notFound := &clientv2.ErrorResponse{GqlErrors: &gqlerror.List{{Message: internalerror.ErrNotFound.String()}}}
	unavailable := errors.New("console unavailable")

	cases := map[string]struct {
		response     *console.GetAgentRunCredentials
		err          error
		want         *console.AgentRunCredentialsFragment
		wantNotFound bool
		wantErr      error
	}{
		"returns the run's credentials": {response: &console.GetAgentRunCredentials{AgentRun: credentials}, want: credentials},
		"not found from Console":        {err: notFound, wantNotFound: true},
		"no response":                   {wantNotFound: true},
		"no agent run in the response":  {response: &console.GetAgentRunCredentials{}, wantNotFound: true},
		"other errors are passed on":    {err: unavailable, wantErr: unavailable},
	}

	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			c := &client{consoleClient: &agentRunCredentialsConsoleClient{response: tc.response, err: tc.err}}

			got, err := c.GetAgentRunCredentials(context.Background(), "run-1")

			switch {
			case tc.wantNotFound:
				assert.True(t, apierrors.IsNotFound(err), "want a not found error, got %v", err)
				assert.Nil(t, got)
			case tc.wantErr != nil:
				assert.ErrorIs(t, err, tc.wantErr)
				assert.Nil(t, got)
			default:
				require.NoError(t, err)
				assert.Same(t, tc.want, got)
			}
		})
	}
}

func TestGetAgentRunCredentialsRequiresID(t *testing.T) {
	c := &client{consoleClient: &agentRunCredentialsConsoleClient{}}

	_, err := c.GetAgentRunCredentials(context.Background(), "")
	assert.Error(t, err)
}
