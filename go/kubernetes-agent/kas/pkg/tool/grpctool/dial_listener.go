package grpctool

import (
	"context"
	"errors"
	"net"
	"sync"
)

type DialListener struct {
	closeOnce sync.Once
	done      chan struct{}
	pipe      chan net.Conn
}

func NewDialListener() *DialListener {
	return &DialListener{
		done: make(chan struct{}),
		pipe: make(chan net.Conn),
	}
}

func (l *DialListener) Accept() (net.Conn, error) {
	select {
	case <-l.done:
		return nil, errors.New("listener closed, cannot accept")
	default:
	}
	select {
	case <-l.done:
		return nil, errors.New("listener closed, cannot accept")
	case conn := <-l.pipe:
		return conn, nil
	}
}

func (l *DialListener) Close() error {
	l.closeOnce.Do(func() {
		close(l.done)
	})
	return nil
}

func (l *DialListener) Addr() net.Addr {
	return pipeAddr{}
}

func (l *DialListener) DialContext(ctx context.Context, addr string) (net.Conn, error) {
	// When multiple channels are ready, 'select' operator picks one of them, but which one is not defined.
	// But we want to guarantee that once the listener had been closed it will never return a connection so
	// we check here that it's still not closed before the main 'select'.
	select {
	case <-l.done:
		return nil, errors.New("listener closed, cannot dial")
	default:
	}
	p1, p2 := net.Pipe()
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	case <-l.done:
		return nil, errors.New("listener closed, cannot dial")
	case l.pipe <- p1:
		return p2, nil
	}
}

type pipeAddr struct{}

func (pipeAddr) Network() string {
	return "pipe"
}

func (pipeAddr) String() string {
	return "pipe"
}
