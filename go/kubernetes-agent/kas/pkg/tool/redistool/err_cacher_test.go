package redistool

import (
	"context"
	"errors"
	"testing"
	"time"

	rmock "github.com/redis/rueidis/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	"go.uber.org/zap/zaptest"

	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/matcher"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_tool"
)

const (
	errKey = "test1"
)

func TestErrCacher_GetError_ReturnsNilOnClientError(t *testing.T) {
	ec, client, rep := setupNormal(t)
	client.EXPECT().
		Do(gomock.Any(), rmock.Match("GET", errKey)).
		Return(rmock.ErrorResult(errors.New("boom")))
	rep.EXPECT().
		HandleProcessingError(gomock.Any(), gomock.Any(), "Failed to get cached error from Redis", matcher.ErrorEq("boom"))
	err := ec.GetError(context.Background(), errKey)
	require.NoError(t, err)
}

func TestErrCacher_GetError_ReturnsNilOnClientNil(t *testing.T) {
	ec, client, _ := setupNormal(t)
	client.EXPECT().
		Do(gomock.Any(), rmock.Match("GET", errKey)).
		Return(rmock.Result(rmock.RedisNil()))
	err := ec.GetError(context.Background(), errKey)
	require.NoError(t, err)
}

func TestErrCacher_GetError_ReturnsNilOnEmptyResponse(t *testing.T) {
	ec, client, _ := setupNormal(t)
	client.EXPECT().
		Do(gomock.Any(), rmock.Match("GET", errKey)).
		Return(rmock.Result(rmock.RedisString("")))
	err := ec.GetError(context.Background(), errKey)
	require.NoError(t, err)
}

func TestErrCacher_GetError_ReturnsNilOnUnmarshalFail(t *testing.T) {
	ec, client, rep := setupError(t)
	client.EXPECT().
		Do(gomock.Any(), rmock.Match("GET", errKey)).
		Return(rmock.Result(rmock.RedisString("boom")))
	rep.EXPECT().
		HandleProcessingError(gomock.Any(), gomock.Any(), "Failed to unmarshal cached error", matcher.ErrorEq("unmarshal error"))
	err := ec.GetError(context.Background(), errKey)
	require.NoError(t, err)
}

func TestErrCacher_GetError_ReturnsCachedError(t *testing.T) {
	ec, client, _ := setupNormal(t)
	client.EXPECT().
		Do(gomock.Any(), rmock.Match("GET", errKey)).
		Return(rmock.Result(rmock.RedisString("boom")))
	err := ec.GetError(context.Background(), errKey)
	require.EqualError(t, err, "boom")
}

func TestErrCacher_CacheError_HappyPath(t *testing.T) {
	ec, client, _ := setupNormal(t)
	client.EXPECT().
		Do(gomock.Any(), rmock.Match("SET", errKey, "boom", "PX", "60000"))
	ec.CacheError(context.Background(), errKey, errors.New("boom"), time.Minute)
}

func TestErrCacher_CacheError_MarshalError(t *testing.T) {
	ec, _, rep := setupError(t)
	rep.EXPECT().
		HandleProcessingError(gomock.Any(), gomock.Any(), "Failed to marshal error for caching", matcher.ErrorEq("marshal error"))
	ec.CacheError(context.Background(), errKey, errors.New("boom"), time.Minute)
}

func setupNormal(t *testing.T) (*ErrCacher[string], *rmock.Client, *mock_tool.MockErrReporter) {
	ctrl := gomock.NewController(t)
	client := rmock.NewClient(ctrl)
	rep := mock_tool.NewMockErrReporter(ctrl)
	ec := &ErrCacher[string]{
		Log:    zaptest.NewLogger(t),
		ErrRep: rep,
		Client: client,
		ErrMarshaler: testErrMarshaler{
			marshal: func(err error) ([]byte, error) {
				return []byte(err.Error()), nil
			},
			unmarshal: func(data []byte) (error, error) {
				return errors.New(string(data)), nil
			},
		},
		KeyToRedisKey: func(key string) string {
			return key
		},
	}
	return ec, client, rep
}

func setupError(t *testing.T) (*ErrCacher[string], *rmock.Client, *mock_tool.MockErrReporter) {
	ctrl := gomock.NewController(t)
	client := rmock.NewClient(ctrl)
	rep := mock_tool.NewMockErrReporter(ctrl)
	ec := &ErrCacher[string]{
		Log:    zaptest.NewLogger(t),
		ErrRep: rep,
		Client: client,
		ErrMarshaler: testErrMarshaler{
			marshal: func(err error) ([]byte, error) {
				return nil, errors.New("marshal error")
			},
			unmarshal: func(data []byte) (error, error) {
				return nil, errors.New("unmarshal error")
			},
		},
		KeyToRedisKey: func(key string) string {
			return key
		},
	}
	return ec, client, rep
}

type testErrMarshaler struct {
	marshal   func(err error) ([]byte, error)
	unmarshal func(data []byte) (error, error)
}

func (m testErrMarshaler) Marshal(err error) ([]byte, error) {
	return m.marshal(err)
}

func (m testErrMarshaler) Unmarshal(data []byte) (error, error) {
	return m.unmarshal(data)
}
