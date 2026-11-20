package controller

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	console "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/deployment-operator/internal/helpers"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/probe"
)

// DevboxConsoleClient is the console API the DevboxRunner controller uses. It is kept narrow and local so
// the shared consoleclient.Client interface (and its mocks) need not change.
type DevboxConsoleClient interface {
	UpsertDevbox(ctx context.Context, attrs console.DevboxAttributes) (*console.DevboxFragment, error)
	HeartbeatDevbox(ctx context.Context, id string, attrs console.DevboxHeartbeatAttributes) error
	// GetDevboxByName returns nil without error when this cluster has no Devbox with that name.
	GetDevboxByName(ctx context.Context, name string) (*console.DevboxFragment, error)
	// DeleteDevbox returns ErrDevboxSnapshotsRemain while workbench snapshots of the box exist.
	DeleteDevbox(ctx context.Context, id string) error
}

var ErrDevboxSnapshotsRemain = errors.New("devbox snapshots remain")

// GraphQLDevboxConsoleClient implements DevboxConsoleClient with the generated go/client operations,
// authenticated with the cluster deploy token.
type GraphQLDevboxConsoleClient struct {
	client console.ConsoleClient
}

var _ DevboxConsoleClient = &GraphQLDevboxConsoleClient{}

func NewGraphQLDevboxConsoleClient(consoleURL, deployToken string) *GraphQLDevboxConsoleClient {
	httpClient := &http.Client{Transport: helpers.NewAuthorizationTokenTransport(deployToken)}
	return &GraphQLDevboxConsoleClient{
		client: console.NewClient(httpClient, consoleURL, nil, console.PersistedQueryInterceptor, console.NewErrorInterceptor()),
	}
}

func (c *GraphQLDevboxConsoleClient) UpsertDevbox(ctx context.Context, attrs console.DevboxAttributes) (*console.DevboxFragment, error) {
	res, err := c.client.UpsertDevbox(ctx, attrs)
	if err != nil {
		return nil, err
	}
	return res.GetUpsertDevbox(), nil
}

func (c *GraphQLDevboxConsoleClient) HeartbeatDevbox(ctx context.Context, id string, attrs console.DevboxHeartbeatAttributes) error {
	_, err := c.client.HeartbeatDevbox(ctx, id, attrs)
	return err
}

func (c *GraphQLDevboxConsoleClient) GetDevboxByName(ctx context.Context, name string) (*console.DevboxFragment, error) {
	res, err := c.client.GetDevboxByName(ctx, name, nil)
	if err != nil {
		if strings.Contains(err.Error(), "no devbox named") {
			return nil, nil
		}
		return nil, err
	}
	return res.GetDevbox(), nil
}

var _ DevboxProbeTokenMinter = &GraphQLDevboxConsoleClient{}

func (c *GraphQLDevboxConsoleClient) MintDevboxProbeToken(ctx context.Context, devboxID string) (probe.Token, error) {
	res, err := c.client.MintDevboxProbeToken(ctx, devboxID)
	if err != nil {
		return probe.Token{}, err
	}
	tok := res.GetMintDevboxProbeToken()
	if tok.GetToken() == "" {
		return probe.Token{}, errors.New("console returned an empty probe token")
	}
	expires, err := time.Parse(time.RFC3339, tok.GetExpiresAt())
	if err != nil {
		return probe.Token{}, fmt.Errorf("parsing probe token expiry %q: %w", tok.GetExpiresAt(), err)
	}
	return probe.Token{Token: tok.GetToken(), ExpiresAt: expires}, nil
}

func (c *GraphQLDevboxConsoleClient) DeleteDevbox(ctx context.Context, id string) error {
	_, err := c.client.DeleteDevbox(ctx, id)
	switch {
	case err == nil:
		return nil
	case strings.Contains(err.Error(), "snapshots of it exist"):
		return ErrDevboxSnapshotsRemain
	case strings.Contains(err.Error(), "could not find resource"), strings.Contains(err.Error(), "not found"):
		return nil
	}
	return err
}
