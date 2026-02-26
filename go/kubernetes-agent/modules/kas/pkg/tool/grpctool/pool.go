package grpctool

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/url"
	"sync"
	"time"

	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
	"k8s.io/utils/clock"

	"github.com/pluralsh/kubernetes-agent/pkg/tool/errz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/logz"
)

const (
	evictIdleConnAfter = 1 * time.Hour
)

type PoolConn interface {
	grpc.ClientConnInterface
	Done()
}

type PoolInterface interface {
	Dial(ctx context.Context, targetUrl string) (PoolConn, error)
	io.Closer
}

type Pool struct {
	mu       sync.Mutex
	log      *zap.Logger
	errRep   errz.ErrReporter
	tlsCreds credentials.TransportCredentials
	dialOpts []grpc.DialOption
	conns    map[string]*connHolder // target -> conn
	clk      clock.PassiveClock
}

func NewPool(log *zap.Logger, errRep errz.ErrReporter, tlsCreds credentials.TransportCredentials, dialOpts ...grpc.DialOption) *Pool {
	return &Pool{
		log:      log,
		errRep:   errRep,
		tlsCreds: tlsCreds,
		dialOpts: dialOpts,
		conns:    map[string]*connHolder{},
		clk:      clock.RealClock{},
	}
}

func (p *Pool) Dial(ctx context.Context, targetUrl string) (PoolConn, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	conn := p.conns[targetUrl]
	if conn == nil {
		u, err := url.Parse(targetUrl)
		if err != nil {
			return nil, err
		}
		var creds credentials.TransportCredentials
		var target string
		switch u.Scheme {
		case "grpc":
			// See https://github.com/grpc/grpc/blob/master/doc/naming.md.
			target = "dns:" + HostWithPort(u)
			creds = insecure.NewCredentials()
		case "grpcs":
			// See https://github.com/grpc/grpc/blob/master/doc/naming.md.
			target = "dns:" + HostWithPort(u)
			creds = p.tlsCreds
		case "unix":
			// See https://github.com/grpc/grpc/blob/master/doc/naming.md.
			target = targetUrl
			creds = insecure.NewCredentials()
		default:
			return nil, fmt.Errorf("unsupported URL scheme in %s", targetUrl)
		}
		opts := make([]grpc.DialOption, 0, len(p.dialOpts)+1)
		opts = append(opts, grpc.WithTransportCredentials(creds))
		opts = append(opts, p.dialOpts...)
		grpcConn, err := grpc.NewClient(target, opts...)
		if err != nil {
			return nil, fmt.Errorf("pool gRPC dial: %w", err)
		}
		conn = &connHolder{
			ClientConn: grpcConn,
		}
		p.conns[targetUrl] = conn
	}
	conn.numUsers++
	return &poolConn{
		connHolder: conn,
		done:       p.connDone,
	}, nil
}

func (p *Pool) Close() error {
	p.mu.Lock()
	defer p.mu.Unlock()
	for targetUrl, conn := range p.conns {
		delete(p.conns, targetUrl)
		log := p.log.With(logz.PoolConnectionUrl(targetUrl))
		if conn.numUsers > 0 {
			log.Sugar().Warnf("Closing pool connection that is being used by %d callers", conn.numUsers)
		}
		err := conn.Close()
		if err != nil {
			p.errRep.HandleProcessingError(context.Background(), log, "Error closing pool connection", err)
		} else {
			log.Debug("Closed pool connection")
		}
	}
	return nil
}

func (p *Pool) connDone(conn *connHolder) {
	p.mu.Lock()
	defer p.mu.Unlock()
	conn.numUsers--
	conn.lastUsed = p.clk.Now()
	p.runGcLocked()
}

func (p *Pool) runGcLocked() {
	expireAt := p.clk.Now().Add(-evictIdleConnAfter)
	for targetUrl, conn := range p.conns {
		if conn.numUsers == 0 && conn.lastUsed.Before(expireAt) {
			delete(p.conns, targetUrl)
			err := conn.Close()
			if err != nil {
				p.errRep.HandleProcessingError(context.Background(), p.log.With(logz.PoolConnectionUrl(targetUrl)), "Error closing idle pool connection", err)
			} else {
				p.log.Debug("Closed idle pool connection", logz.PoolConnectionUrl(targetUrl))
			}
		}
	}
}

type connHolder struct {
	*grpc.ClientConn
	lastUsed time.Time
	numUsers int32 // protected by mutex
}

type poolConn struct {
	*connHolder
	done func(conn *connHolder)
}

func (c *poolConn) Done() {
	if c.done == nil {
		panic(errors.New("pool connection Done() called more than once"))
	}
	done := c.done
	c.done = nil
	done(c.connHolder)
}
