package exec

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestRunStreamDoesNotDropLinesUnderCallbackBackpressure(t *testing.T) {
	const lineCount = 512

	exe := NewExecutable("sh", WithArgs([]string{
		"-c",
		fmt.Sprintf(`i=0; while [ "$i" -lt %d ]; do echo "line-$i"; i=$((i+1)); done`, lineCount),
	}))

	var (
		mu       sync.Mutex
		received []string
		inFlight atomic.Int32
		maxInFly atomic.Int32
	)

	err := exe.RunStream(context.Background(), func(line []byte) {
		n := inFlight.Add(1)
		for {
			cur := maxInFly.Load()
			if n <= cur || maxInFly.CompareAndSwap(cur, n) {
				break
			}
		}
		// Slow enough that a non-blocking 256-buffer would drop without backpressure.
		time.Sleep(2 * time.Millisecond)
		mu.Lock()
		received = append(received, string(line))
		mu.Unlock()
		inFlight.Add(-1)
	})
	require.NoError(t, err)
	require.Equal(t, int32(0), inFlight.Load(), "callback worker should finish before RunStream returns")
	require.Greater(t, maxInFly.Load(), int32(0))

	mu.Lock()
	defer mu.Unlock()
	require.Len(t, received, lineCount)
	for i := 0; i < lineCount; i++ {
		require.Equal(t, fmt.Sprintf("line-%d", i), received[i])
	}
}
