package client

import (
	"context"
	"testing"
	"time"

	"github.com/Yamashou/gqlgenc/clientv2"
	console "github.com/pluralsh/console/go/client"
	pollycache "github.com/pluralsh/console/go/polly/cache"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type myClusterConsoleClient struct {
	console.ConsoleClient
	calls int
}

func (c *myClusterConsoleClient) MyCluster(_ context.Context, _ ...clientv2.RequestInterceptor) (*console.MyCluster, error) {
	c.calls++
	return &console.MyCluster{}, nil
}

func TestMyClusterCachesSuccessfulResponse(t *testing.T) {
	consoleClient := &myClusterConsoleClient{}
	client := &client{
		ctx:           context.Background(),
		consoleClient: consoleClient,
		myClusterCache: pollycache.NewCache[console.MyCluster](time.Hour, func(string) (*console.MyCluster, error) {
			return consoleClient.MyCluster(context.Background())
		}),
	}

	first, err := client.MyCluster()
	require.NoError(t, err)
	second, err := client.MyCluster()
	require.NoError(t, err)

	assert.Same(t, first, second)
	assert.Equal(t, 1, consoleClient.calls)
}
