package console

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	pb "github.com/pluralsh/console/go/nexus/internal/proto"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestClientCacheConcurrentMissesShareRefresh(t *testing.T) {
	const callers = 32

	var calls atomic.Int32
	release := make(chan struct{})
	config := &pb.AiConfig{Enabled: true}
	cache := &clientCache{
		logger: zap.NewNop(),
		configGetter: func(context.Context) (*pb.AiConfig, error) {
			calls.Add(1)
			<-release
			return config, nil
		},
		ttl: time.Minute,
	}

	results := make(chan *pb.AiConfig, callers)
	errors := make(chan error, callers)
	var wg sync.WaitGroup
	wg.Add(callers)

	for range callers {
		go func() {
			defer wg.Done()
			result, err := cache.GetAiConfig(context.Background())
			results <- result
			errors <- err
		}()
	}

	require.Eventually(t, func() bool {
		return calls.Load() == 1
	}, time.Second, time.Millisecond)
	close(release)
	wg.Wait()
	close(results)
	close(errors)

	for err := range errors {
		require.NoError(t, err)
	}
	for result := range results {
		require.Same(t, config, result)
	}
	require.Equal(t, int32(1), calls.Load())
}
