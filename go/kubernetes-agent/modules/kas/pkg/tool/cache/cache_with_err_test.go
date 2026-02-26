package cache

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/mock/gomock"

	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_cache"
)

func TestGetItem_HappyPath(t *testing.T) {
	ctrl := gomock.NewController(t)
	errCacher := mock_cache.NewMockErrCacher[int](ctrl)
	errCacher.EXPECT().GetError(gomock.Any(), key)
	tracer := trace.NewNoopTracerProvider().Tracer("")
	c := NewWithError[int, int](time.Minute, time.Minute, errCacher, tracer, alwaysCache)
	item, err := c.GetItem(context.Background(), key, func() (int, error) {
		return itemVal, nil
	})
	require.NoError(t, err)
	assert.Equal(t, itemVal, item)

	item, err = c.GetItem(context.Background(), key, func() (int, error) {
		t.FailNow()
		return 0, nil
	})
	require.NoError(t, err)
	assert.Equal(t, itemVal, item)
}

func TestGetItem_CacheableError(t *testing.T) {
	ctrl := gomock.NewController(t)
	errCacher := mock_cache.NewMockErrCacher[int](ctrl)
	errToCache := errors.New("boom")
	gomock.InOrder(
		errCacher.EXPECT().
			GetError(gomock.Any(), key),
		errCacher.EXPECT().
			CacheError(gomock.Any(), key, errToCache, time.Minute),
		errCacher.EXPECT().
			GetError(gomock.Any(), key).
			Return(errToCache),
	)
	tracer := trace.NewNoopTracerProvider().Tracer("")
	c := NewWithError[int, int](time.Second, time.Minute, errCacher, tracer, alwaysCache)
	_, err := c.GetItem(context.Background(), key, func() (int, error) {
		return 0, errToCache
	})
	assert.EqualError(t, err, "boom")

	_, err = c.GetItem(context.Background(), key, func() (int, error) {
		t.FailNow()
		return 0, nil
	})
	assert.EqualError(t, err, "boom")
}

func TestGetItem_NonCacheableError(t *testing.T) {
	ctrl := gomock.NewController(t)
	errCacher := mock_cache.NewMockErrCacher[int](ctrl)
	errCacher.EXPECT().
		GetError(gomock.Any(), key).
		Times(2)
	tracer := trace.NewNoopTracerProvider().Tracer("")
	c := NewWithError[int, int](time.Minute, time.Minute, errCacher, tracer, func(err error) bool {
		return false
	})
	_, err := c.GetItem(context.Background(), key, func() (int, error) {
		return 0, errors.New("boom")
	})
	assert.EqualError(t, err, "boom")

	_, err = c.GetItem(context.Background(), key, func() (int, error) {
		return 0, errors.New("bAAm")
	})
	assert.EqualError(t, err, "bAAm")
}

func TestGetItem_Context(t *testing.T) {
	ctrl := gomock.NewController(t)
	errCacher := mock_cache.NewMockErrCacher[int](ctrl)
	errCacher.EXPECT().GetError(gomock.Any(), key)
	tracer := trace.NewNoopTracerProvider().Tracer("")
	c := NewWithError[int, int](time.Minute, time.Minute, errCacher, tracer, alwaysCache)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	start := make(chan struct{})
	done := make(chan struct{})
	go func() {
		defer close(done)
		<-start
		_, err := c.GetItem(ctx, key, func() (int, error) {
			return -itemVal, nil
		})
		assert.Equal(t, context.Canceled, err)
	}()
	item, err := c.GetItem(context.Background(), key, func() (int, error) {
		close(start)
		cancel()
		<-done
		return itemVal, nil
	})
	require.NoError(t, err)
	assert.Equal(t, itemVal, item)
}

func alwaysCache(err error) bool {
	return true
}
