package exec

import (
	"context"
	"errors"
	"io"
	"sync/atomic"
	"testing"

	stackv1 "github.com/pluralsh/console/go/deployment-operator/pkg/harness/stackrun/v1"
	"github.com/stretchr/testify/require"
)

func TestStartWithStdioRunsLifecycleHooksAndClosesStreams(t *testing.T) {
	var preStarts atomic.Int32
	var postStarts atomic.Int32
	process, err := StartWithStdio(context.Background(), "sh",
		WithArgs([]string{"-c", "read value; printf '%s' \"$value\""}),
		WithHook(stackv1.LifecyclePreStart, func() error {
			preStarts.Add(1)
			return nil
		}),
		WithHook(stackv1.LifecyclePostStart, func() error {
			postStarts.Add(1)
			return nil
		}),
	)
	require.NoError(t, err)

	stdout := make(chan []byte, 1)
	go func() {
		output, _ := io.ReadAll(process.Stdout)
		stdout <- output
	}()
	_, err = io.WriteString(process.Stdin, "hello\n")
	require.NoError(t, err)
	require.NoError(t, process.Stdin.Close())
	require.NoError(t, process.Wait())
	require.NoError(t, process.Wait(), "Wait must be idempotent")
	require.Equal(t, []byte("hello"), <-stdout)
	require.Equal(t, int32(1), preStarts.Load())
	require.Equal(t, int32(1), postStarts.Load())
	require.NoError(t, process.Close())
}

func TestStartWithStdioStopIsIdempotent(t *testing.T) {
	var postStarts atomic.Int32
	process, err := StartWithStdio(context.Background(), "sh",
		WithArgs([]string{"-c", "sleep 30"}),
		WithHook(stackv1.LifecyclePostStart, func() error {
			postStarts.Add(1)
			return nil
		}),
	)
	require.NoError(t, err)

	require.NoError(t, process.Stop())
	require.NoError(t, process.Stop(), "Stop must be idempotent")
	require.NoError(t, process.Wait())
	require.NoError(t, process.Wait(), "Wait must be idempotent")
	require.Equal(t, int32(1), postStarts.Load())
	require.NoError(t, process.Close())
}

func TestStartWithStdioPreStartFailureDoesNotStartProcess(t *testing.T) {
	preErr := errors.New("pre-start failed")
	process, err := StartWithStdio(context.Background(), "sh",
		WithArgs([]string{"-c", "exit 0"}),
		WithHook(stackv1.LifecyclePreStart, func() error { return preErr }),
	)
	require.ErrorIs(t, err, preErr)
	require.Nil(t, process)
}
