package grpctool

import (
	"context"
	"errors"
	"io"
	"net"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/stats"
	"google.golang.org/grpc/status"
	"k8s.io/apimachinery/pkg/util/wait"

	test2 "github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool/test"
)

// These tests explore various gRPC error scenarios and other poorly documented things.

func TestGrpcErrors_ClientCancel_NilErrReturn(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	ats := &test2.GrpcTestingServer{
		UnaryFunc: func(ctx context.Context, request *test2.Request) (*test2.Response, error) {
			cancel()
			<-ctx.Done()
			return &test2.Response{}, nil // nil error is still turned into Canceled
		},
	}
	conn := setup(t, ats)
	client := test2.NewTestingClient(conn)
	_, err := client.RequestResponse(ctx, &test2.Request{})
	assert.EqualError(t, err, "rpc error: code = Canceled desc = context canceled")
}

func TestGrpcErrors_ClientCancel_CustomErrReturn(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	ats := &test2.GrpcTestingServer{
		UnaryFunc: func(ctx context.Context, request *test2.Request) (*test2.Response, error) {
			cancel()
			<-ctx.Done()
			return nil, errors.New("boom") // doesn't matter, still turned into Canceled
		},
	}
	conn := setup(t, ats)
	client := test2.NewTestingClient(conn)
	_, err := client.RequestResponse(ctx, &test2.Request{})
	assert.EqualError(t, err, "rpc error: code = Canceled desc = context canceled")
}

func TestGrpcErrors_ClientCancel_CustomGrpcErrReturn(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	ats := &test2.GrpcTestingServer{
		UnaryFunc: func(ctx context.Context, request *test2.Request) (*test2.Response, error) {
			cancel()
			<-ctx.Done()
			return nil, status.Error(codes.Unavailable, "Unavailable :(") // doesn't matter, still turned into Canceled
		},
	}
	conn := setup(t, ats)
	client := test2.NewTestingClient(conn)
	_, err := client.RequestResponse(ctx, &test2.Request{})
	assert.EqualError(t, err, "rpc error: code = Canceled desc = context canceled")
}

func TestGrpcErrors_InterceptorVsStatsHandlerError(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	ats := &test2.GrpcTestingServer{
		UnaryFunc: func(ctx context.Context, request *test2.Request) (*test2.Response, error) {
			cancel()
			<-ctx.Done()
			return nil, status.Error(codes.Unavailable, "Unavailable :(")
		},
	}
	sh := &statsHandler{}
	conn := setup(t, ats,
		grpc.StatsHandler(sh),
		grpc.UnaryInterceptor(func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
			resp, err := handler(ctx, req)
			assert.EqualError(t, err, "rpc error: code = Unavailable desc = Unavailable :(") // Interceptor sees error from the handler
			return resp, err
		}))
	client := test2.NewTestingClient(conn)
	_, err := client.RequestResponse(ctx, &test2.Request{})
	assert.EqualError(t, err, "rpc error: code = Canceled desc = context canceled")
	time.Sleep(50 * time.Millisecond) // give gRPC a moment to actually call the stats handler
	sh.mu.Lock()
	defer sh.mu.Unlock()

	assert.Equal(t, 1, sh.times)
	assert.EqualError(t, sh.err, "rpc error: code = Unavailable desc = Unavailable :(") // StatsHandler too sees error from the handler
}

func TestGrpcErrors_AbruptConnectionDrop(t *testing.T) {
	l := NewDialListener()
	defer func() {
		assert.NoError(t, l.Close())
	}()
	conn, err := grpc.DialContext(context.Background(), "passthrough:pipe",
		grpc.WithContextDialer(l.DialContext),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	require.NoError(t, err)

	s := grpc.NewServer()
	test2.RegisterTestingServer(s, &test2.GrpcTestingServer{
		StreamingFunc: func(server test2.Testing_StreamingRequestResponseServer) error {
			assert.NoError(t, conn.Close()) // drop client connection
			_, recvErr := server.Recv()
			assert.EqualError(t, recvErr, "rpc error: code = Canceled desc = context canceled")
			return nil
		},
	})
	var wg wait.Group
	defer func() {
		s.GracefulStop()
		wg.Wait()
	}()
	wg.Start(func() {
		assert.NoError(t, s.Serve(l))
	})

	client := test2.NewTestingClient(conn)
	resp, err := client.StreamingRequestResponse(context.Background())
	assert.NoError(t, err)
	_, err = resp.Recv()
	if status.Code(err) == codes.Unavailable {
		assert.EqualError(t, err, "rpc error: code = Unavailable desc = error reading from server: io: read/write on closed pipe")
	} else {
		assert.EqualError(t, err, "rpc error: code = Canceled desc = grpc: the client connection is closing")
	}
}

func TestGrpcErrors_ErrorReadingRequest(t *testing.T) {
	cConn, sConn := net.Pipe()
	conn, err := grpc.DialContext(context.Background(), "passthrough:pipe",
		grpc.WithContextDialer(onceDialer(cConn)),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	require.NoError(t, err)

	bc := newBrokenConn(sConn)

	s := grpc.NewServer()
	isBroken := make(chan struct{})
	test2.RegisterTestingServer(s, &test2.GrpcTestingServer{
		StreamingFunc: func(server test2.Testing_StreamingRequestResponseServer) error {
			bc.BreakRead(errors.New("read failed, boom"))
			close(isBroken)
			_, recvErr := server.Recv()
			assert.EqualError(t, recvErr, "rpc error: code = Canceled desc = context canceled")
			return nil
		},
	})
	var wg wait.Group
	defer func() {
		s.GracefulStop()
		wg.Wait()
	}()
	wg.Start(func() {
		assert.NoError(t, s.Serve(newOnceListener(bc)))
	})

	client := test2.NewTestingClient(conn)
	resp, err := client.StreamingRequestResponse(context.Background())
	assert.NoError(t, err)
	<-isBroken
	gotEof := false
	for !gotEof { // should eventually get an io.EOF when sending over a broken connection
		err = resp.Send(&test2.Request{})
		gotEof = err == io.EOF // nolint:errorlint
	}
	_, err = resp.Recv()
	assert.EqualError(t, err, "rpc error: code = Unavailable desc = error reading from server: EOF")
}

func TestGrpcErrors_ErrorWritingResponse(t *testing.T) {
	cConn, sConn := net.Pipe()
	conn, err := grpc.DialContext(context.Background(), "passthrough:pipe",
		grpc.WithContextDialer(onceDialer(cConn)),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	require.NoError(t, err)

	bc := newBrokenConn(sConn)

	s := grpc.NewServer()
	test2.RegisterTestingServer(s, &test2.GrpcTestingServer{
		StreamingFunc: func(server test2.Testing_StreamingRequestResponseServer) error {
			bc.BreakWrite(errors.New("write failed, boom"))
			sendErr := server.Send(&test2.Response{})
			assert.NoError(t, sendErr) // send is async
			bc.BreakRead(errors.New("read failed, boom"))
			_, recvErr := server.Recv() // read would block if not broken
			assert.EqualError(t, recvErr, "rpc error: code = Canceled desc = context canceled")
			return nil
		},
	})
	var wg wait.Group
	defer func() {
		s.GracefulStop()
		wg.Wait()
	}()
	wg.Start(func() {
		assert.NoError(t, s.Serve(newOnceListener(bc)))
	})

	client := test2.NewTestingClient(conn)
	resp, err := client.StreamingRequestResponse(context.Background())
	assert.NoError(t, err)
	_, err = resp.Recv()
	assert.EqualError(t, err, "rpc error: code = Unavailable desc = error reading from server: EOF")
}

func TestGrpcErrors_SendingRequestWhenResponseHasBeenSent(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	ats := &test2.GrpcTestingServer{
		StreamingFunc: func(server test2.Testing_StreamingRequestResponseServer) error {
			return status.Error(codes.NotFound, "not found")
		},
	}
	conn := setup(t, ats)
	client := test2.NewTestingClient(conn)
	resp, err := client.StreamingRequestResponse(ctx)
	require.NoError(t, err)
	gotEof := false
	for !gotEof { // should eventually get an io.EOF when sending over a broken connection
		// protocol error - trying to send something when the server has responded already.
		err = resp.Send(&test2.Request{})
		gotEof = err == io.EOF // nolint:errorlint
	}
	_, err = resp.Recv()
	assert.EqualError(t, err, "rpc error: code = NotFound desc = not found")
}

func setup(t *testing.T, srv test2.TestingServer, opt ...grpc.ServerOption) *grpc.ClientConn {
	l := NewDialListener()
	t.Cleanup(func() {
		assert.NoError(t, l.Close())
	})
	s := grpc.NewServer(opt...)
	test2.RegisterTestingServer(s, srv)
	var wg wait.Group
	t.Cleanup(func() {
		s.GracefulStop()
		wg.Wait()
	})
	wg.Start(func() {
		assert.NoError(t, s.Serve(l))
	})
	conn, err := grpc.DialContext(context.Background(), "passthrough:pipe",
		grpc.WithContextDialer(l.DialContext),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	require.NoError(t, err)
	t.Cleanup(func() {
		assert.NoError(t, conn.Close())
	})
	return conn
}

var (
	_ stats.Handler = (*statsHandler)(nil)
	_ net.Conn      = (*brokenConn)(nil)
	_ net.Listener  = (*onceListener)(nil)
)

type statsHandler struct {
	mu    sync.Mutex
	times int
	err   error
}

func (h *statsHandler) TagRPC(ctx context.Context, info *stats.RPCTagInfo) context.Context {
	return ctx
}

func (h *statsHandler) HandleRPC(ctx context.Context, rpcStats stats.RPCStats) {
	x, ok := rpcStats.(*stats.End)
	if !ok {
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	h.times++
	h.err = x.Error
}

func (h *statsHandler) TagConn(ctx context.Context, info *stats.ConnTagInfo) context.Context {
	return ctx
}

func (h *statsHandler) HandleConn(ctx context.Context, connStats stats.ConnStats) {
}

type brokenConn struct {
	delegate    net.Conn
	readErr     error
	readBroken  chan struct{}
	writeErr    error
	writeBroken chan struct{}
}

func newBrokenConn(delegate net.Conn) *brokenConn {
	return &brokenConn{
		delegate:    delegate,
		readBroken:  make(chan struct{}),
		writeBroken: make(chan struct{}),
	}
}

func (c *brokenConn) BreakRead(err error) {
	c.readErr = err
	close(c.readBroken)
}

func (c *brokenConn) BreakWrite(err error) {
	c.writeErr = err
	close(c.writeBroken)
}

func (c *brokenConn) Read(b []byte) (int, error) {
	select {
	case <-c.readBroken:
		return 0, c.readErr
	default:
	}
	var (
		n      int
		err    error
		signal = make(chan struct{})
		buf    = make([]byte, len(b)) // intermediate buffer to avoid races
	)
	go func() {
		n, err = c.delegate.Read(buf)
		close(signal)
	}()
	select {
	case <-c.readBroken:
		return 0, c.readErr
	case <-signal:
		copy(b, buf[:n])
		return n, err
	}
}

func (c *brokenConn) Write(b []byte) (int, error) {
	select {
	case <-c.writeBroken:
		return 0, c.writeErr
	default:
	}
	return c.delegate.Write(b)
}

func (c *brokenConn) Close() error {
	return c.delegate.Close()
}

func (c *brokenConn) LocalAddr() net.Addr {
	return c.delegate.LocalAddr()
}

func (c *brokenConn) RemoteAddr() net.Addr {
	return c.delegate.RemoteAddr()
}

func (c *brokenConn) SetDeadline(t time.Time) error {
	return c.delegate.SetDeadline(t)
}

func (c *brokenConn) SetReadDeadline(t time.Time) error {
	return c.delegate.SetReadDeadline(t)
}

func (c *brokenConn) SetWriteDeadline(t time.Time) error {
	return c.delegate.SetWriteDeadline(t)
}

type onceListener struct {
	mu       sync.Mutex
	cond     *sync.Cond
	conn     net.Conn
	isClosed bool
}

func newOnceListener(conn net.Conn) *onceListener {
	l := &onceListener{
		conn: conn,
	}
	l.cond = sync.NewCond(&l.mu)
	return l
}

func (l *onceListener) Accept() (net.Conn, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if !l.isClosed {
		if l.conn != nil {
			c := l.conn
			l.conn = nil
			return c, nil
		}
		l.cond.Wait() // wait for close to be called
	}
	return nil, errors.New("listener is closed")
}

func (l *onceListener) Close() error {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.isClosed {
		return nil
	}
	l.isClosed = true
	l.cond.Broadcast()
	return nil
}

func (l *onceListener) Addr() net.Addr {
	return &net.IPNet{}
}

func onceDialer(c net.Conn) func(context.Context, string) (net.Conn, error) {
	var o sync.Once
	return func(ctx context.Context, s string) (net.Conn, error) {
		var onceClientConn net.Conn
		o.Do(func() {
			onceClientConn = c
		})
		if onceClientConn != nil {
			return onceClientConn, nil
		}
		<-ctx.Done()
		return nil, ctx.Err()
	}
}
