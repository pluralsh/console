package grpctool

import (
	"context"
	"io"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	"go.uber.org/zap/zaptest"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
	clocktesting "k8s.io/utils/clock/testing"

	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_tool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/tlstool"
)

const (
	t1 = "grpc://127.0.0.1:1"
	t2 = "grpc://127.0.0.1:2"
)

var (
	_ PoolInterface = (*Pool)(nil)
	_ PoolConn      = (*poolConn)(nil)
	_ PoolInterface = (*PoolSelf)(nil)
	_ PoolConn      = (*selfPoolConn)(nil)
)

func TestKasPool_DialConnDifferentPort(t *testing.T) {
	ctrl := gomock.NewController(t)
	rep := mock_tool.NewMockErrReporter(ctrl)
	p := NewPool(zaptest.NewLogger(t), rep, credentials.NewTLS(tlstool.DefaultClientTLSConfig()))
	defer clz(t, p)
	c1, err := p.Dial(context.Background(), t1)
	require.NoError(t, err)
	c1.Done()
	c2, err := p.Dial(context.Background(), t2)
	require.NoError(t, err)
	assert.NotSame(t, c1, c2)
	c2.Done()
}

func TestKasPool_DialConnSequentialReuse(t *testing.T) {
	ctrl := gomock.NewController(t)
	rep := mock_tool.NewMockErrReporter(ctrl)
	p := NewPool(zaptest.NewLogger(t), rep, credentials.NewTLS(tlstool.DefaultClientTLSConfig()))
	defer clz(t, p)
	c1, err := p.Dial(context.Background(), t1)
	require.NoError(t, err)
	c1.Done()
	c2, err := p.Dial(context.Background(), t1)
	require.NoError(t, err)
	assert.Same(t, c1.(*poolConn).ClientConn, c2.(*poolConn).ClientConn)
	c2.Done()
}

func TestKasPool_DialConnConcurrentReuse(t *testing.T) {
	ctrl := gomock.NewController(t)
	rep := mock_tool.NewMockErrReporter(ctrl)
	p := NewPool(zaptest.NewLogger(t), rep, credentials.NewTLS(tlstool.DefaultClientTLSConfig()))
	defer clz(t, p)
	c1, err := p.Dial(context.Background(), t1)
	require.NoError(t, err)
	c2, err := p.Dial(context.Background(), t1)
	require.NoError(t, err)
	assert.Same(t, c1.(*poolConn).ClientConn, c2.(*poolConn).ClientConn)
	c1.Done()
	c2.Done()
}

func TestKasPool_CloseClosesAllConnections(t *testing.T) {
	ctrl := gomock.NewController(t)
	rep := mock_tool.NewMockErrReporter(ctrl)
	p := NewPool(zaptest.NewLogger(t), rep, credentials.NewTLS(tlstool.DefaultClientTLSConfig()))
	c, err := p.Dial(context.Background(), t1)
	require.NoError(t, err)
	c.Done()
	require.NoError(t, p.Close())
	assert.Empty(t, p.conns)
}

func TestKasPool_DonePanicsOnMultipleInvocations(t *testing.T) {
	ctrl := gomock.NewController(t)
	rep := mock_tool.NewMockErrReporter(ctrl)
	p := NewPool(zaptest.NewLogger(t), rep, credentials.NewTLS(tlstool.DefaultClientTLSConfig()))
	defer clz(t, p)
	c, err := p.Dial(context.Background(), t1)
	require.NoError(t, err)
	c.Done()
	assert.PanicsWithError(t, "pool connection Done() called more than once", func() {
		c.Done()
	})
}

func TestKasPool_DoneEvictsExpiredIdleConnections(t *testing.T) {
	start := time.Now()
	tClock := clocktesting.NewFakePassiveClock(start)
	p := &Pool{
		log:      zaptest.NewLogger(t),
		dialOpts: []grpc.DialOption{grpc.WithTransportCredentials(insecure.NewCredentials())},
		conns:    map[string]*connHolder{},
		clk:      tClock,
	}
	defer clz(t, p)
	c1, err := p.Dial(context.Background(), t1)
	require.NoError(t, err)
	c1.Done()
	tClock.SetTime(start.Add(2 * evictIdleConnAfter))
	p.runGcLocked()
	assert.Empty(t, p.conns)
}

func clz(t *testing.T, c io.Closer) {
	assert.NoError(t, c.Close())
}
