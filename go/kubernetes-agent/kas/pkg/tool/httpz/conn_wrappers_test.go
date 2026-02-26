package httpz_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	"k8s.io/apimachinery/pkg/util/wait"

	"github.com/pluralsh/kubernetes-agent/pkg/tool/httpz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_stdlib"
)

func TestContextConn_CloseUnblocksGoroutine(t *testing.T) {
	ctrl := gomock.NewController(t)
	conn := mock_stdlib.NewMockConn(ctrl)
	conn.EXPECT().
		Close()
	cc := httpz.NewContextConn(conn)
	var wg wait.Group
	wg.Start(func() {
		cc.CloseOnDone(context.Background())
	})
	require.NoError(t, cc.Close())
	wg.Wait()
}

func TestContextConn_ContextClosesConn(t *testing.T) {
	ctrl := gomock.NewController(t)
	conn := mock_stdlib.NewMockConn(ctrl)
	conn.EXPECT().
		Close()
	cc := httpz.NewContextConn(conn)
	ctx, cancel := context.WithCancel(context.Background())
	var wg wait.Group
	wg.Start(func() {
		cc.CloseOnDone(ctx)
	})
	cancel()
	wg.Wait()
}

func TestContextConn_DuplicateClose(t *testing.T) {
	ctrl := gomock.NewController(t)
	conn := mock_stdlib.NewMockConn(ctrl)
	conn.EXPECT().
		Close().
		Times(2)
	cc := httpz.NewContextConn(conn)
	require.NoError(t, cc.Close())
	require.NoError(t, cc.Close())
}

func TestWriteTimeoutConn_SetsWriteDeadline(t *testing.T) {
	ctrl := gomock.NewController(t)
	conn := mock_stdlib.NewMockConn(ctrl)
	gomock.InOrder(
		conn.EXPECT().
			SetWriteDeadline(gomock.Any()),
		conn.EXPECT().
			Write([]byte{1, 2, 3}).
			Return(3, nil),
	)
	tc := httpz.WriteTimeoutConn{
		Conn:    conn,
		Timeout: time.Second,
	}
	n, err := tc.Write([]byte{1, 2, 3})
	require.NoError(t, err)
	assert.EqualValues(t, 3, n)
}

func TestWriteTimeoutConn_ReturnsErrorFromSetWriteDeadline(t *testing.T) {
	ctrl := gomock.NewController(t)
	conn := mock_stdlib.NewMockConn(ctrl)
	conn.EXPECT().
		SetWriteDeadline(gomock.Any()).
		Return(errors.New("boom"))
	tc := httpz.WriteTimeoutConn{
		Conn:    conn,
		Timeout: time.Second,
	}
	_, err := tc.Write([]byte{1, 2, 3})
	assert.EqualError(t, err, "boom")
}
