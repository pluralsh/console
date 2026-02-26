package grpctool_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	"google.golang.org/grpc"

	"github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_rpc"
)

type testServerLimiter struct {
	allow bool
}

func (l *testServerLimiter) Allow(ctx context.Context) bool {
	return l.allow
}

func TestServerInterceptors(t *testing.T) {
	ctrl := gomock.NewController(t)
	usHandler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return struct{}{}, nil
	}
	ssHandler := func(interface{}, grpc.ServerStream) error {
		return nil
	}
	t.Run("It lets the connection through when allowed", func(t *testing.T) {
		limiter := &testServerLimiter{allow: true}

		usi := grpctool.UnaryServerLimitingInterceptor(limiter)
		_, err := usi(context.Background(), struct{}{}, nil, usHandler)
		require.NoError(t, err)

		ssi := grpctool.StreamServerLimitingInterceptor(limiter)
		ss := mock_rpc.NewMockServerStream(ctrl)
		ss.EXPECT().Context().Return(context.Background())
		err = ssi(struct{}{}, ss, nil, ssHandler)
		require.NoError(t, err)
	})

	t.Run("It blocks the connection when not allowed", func(t *testing.T) {
		limiter := &testServerLimiter{false}

		usi := grpctool.UnaryServerLimitingInterceptor(limiter)
		_, err := usi(context.Background(), struct{}{}, nil, usHandler)
		require.Error(t, err)

		ssi := grpctool.StreamServerLimitingInterceptor(limiter)
		ss := mock_rpc.NewMockServerStream(ctrl)
		ss.EXPECT().Context().Return(context.Background())
		err = ssi(struct{}{}, ss, nil, ssHandler)
		require.Error(t, err)
	})
}
