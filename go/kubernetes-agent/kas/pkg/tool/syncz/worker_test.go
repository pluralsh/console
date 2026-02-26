package syncz

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func Test_Worker_StopNoop(t *testing.T) {
	called := 0
	w := NewComparableWorkerHolder[string](func(s string) Worker {
		return WorkerFunc(func(ctx context.Context) {
			called++
			<-ctx.Done()
		})
	})

	w.StopAndWait()

	assert.Zero(t, called)
}

func Test_Worker_SingleValue(t *testing.T) {
	called := 0
	w := NewComparableWorkerHolder[string](func(s string) Worker {
		return WorkerFunc(func(ctx context.Context) {
			called++
			<-ctx.Done()
		})
	})

	w.ApplyConfig(context.Background(), "test")
	w.StopAndWait()

	assert.Equal(t, 1, called)
}

func Test_Worker_Duplicate(t *testing.T) {
	called := 0
	w := NewComparableWorkerHolder[string](func(s string) Worker {
		return WorkerFunc(func(ctx context.Context) {
			called++
			<-ctx.Done()
		})
	})

	w.ApplyConfig(context.Background(), "test")
	w.ApplyConfig(context.Background(), "test")
	w.StopAndWait()

	assert.Equal(t, 1, called)
}

func Test_Worker_NewValue(t *testing.T) {
	called := 0
	w := NewComparableWorkerHolder[string](func(s string) Worker {
		return WorkerFunc(func(ctx context.Context) {
			called++
			<-ctx.Done()
		})
	})

	w.ApplyConfig(context.Background(), "a")
	w.ApplyConfig(context.Background(), "b")
	w.StopAndWait()

	assert.Equal(t, 2, called)
}

func Test_Worker_ContextInherited(t *testing.T) {
	type key struct{}
	var k key
	ctx := context.WithValue(context.Background(), k, 2)
	var value any
	w := NewComparableWorkerHolder[string](func(s string) Worker {
		return WorkerFunc(func(ctx context.Context) {
			value = ctx.Value(k)
		})
	})

	w.ApplyConfig(ctx, "test")
	w.StopAndWait()

	assert.Equal(t, 2, value)
}
