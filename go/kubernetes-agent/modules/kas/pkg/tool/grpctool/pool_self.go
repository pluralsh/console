package grpctool

import (
	"context"

	"google.golang.org/grpc"
)

// PoolSelf is a decorator that uses an in-memory connection to dial self rather than going over network.
type PoolSelf struct {
	delegate PoolInterface
	selfUrl  string
	conn     selfPoolConn
}

func NewPoolSelf(delegate PoolInterface, selfUrl string, selfConn grpc.ClientConnInterface) *PoolSelf {
	return &PoolSelf{
		delegate: delegate,
		selfUrl:  selfUrl,
		conn: selfPoolConn{
			ClientConnInterface: selfConn,
		},
	}
}

func (p *PoolSelf) Dial(ctx context.Context, targetUrl string) (PoolConn, error) {
	if targetUrl == p.selfUrl {
		return &p.conn, nil
	}
	return p.delegate.Dial(ctx, targetUrl)
}

func (p *PoolSelf) Close() error {
	return p.delegate.Close()
}

type selfPoolConn struct {
	grpc.ClientConnInterface
}

func (s *selfPoolConn) Done() {
	// noop
}
