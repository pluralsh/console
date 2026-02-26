package httpz

import (
	"context"
	"net"
	"sync"
	"time"
)

// ContextConn is a wrapper around net.Conn that can be used to tie connection lifetime to context cancellation.
type ContextConn struct {
	net.Conn
	closeOnce         sync.Once
	cancelContextSync chan struct{}
}

func NewContextConn(conn net.Conn) *ContextConn {
	return &ContextConn{
		Conn:              conn,
		cancelContextSync: make(chan struct{}),
	}
}

func (c *ContextConn) CloseOnDone(ctx context.Context) {
	select {
	case <-ctx.Done():
		_ = c.Conn.Close()
	case <-c.cancelContextSync:
	}
}

func (c *ContextConn) Close() error {
	c.closeOnce.Do(func() {
		close(c.cancelContextSync)
	})
	return c.Conn.Close()
}

type WriteTimeoutConn struct {
	net.Conn
	Timeout time.Duration
}

func (c *WriteTimeoutConn) Write(b []byte) (int, error) {
	err := c.SetWriteDeadline(time.Now().Add(c.Timeout))
	if err != nil {
		return 0, err
	}
	return c.Conn.Write(b)
}
