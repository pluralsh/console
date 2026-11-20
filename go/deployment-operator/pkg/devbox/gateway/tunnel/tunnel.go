package tunnel

import (
	"context"
	"errors"
	"fmt"
	"io"
	"math/rand/v2"
	"sync"
	"time"

	"github.com/go-logr/logr"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/encoding"
	"google.golang.org/grpc/mem"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

// Defaults match agentk's reverse tunnel pool.
const (
	DefaultMinIdle     = 10
	DefaultMaxConns    = 500
	DefaultScaleUpStep = 10
	DefaultMaxIdleTime = time.Minute

	DefaultInitialBackoff = time.Second
	DefaultMaxBackoff     = time.Minute
)

// Descriptor lists every method of the given services, the first frame of each tunnel.
func Descriptor(services ...*grpc.ServiceDesc) *devboxv1.TunnelAgentDescriptor {
	d := &devboxv1.TunnelAgentDescriptor{}
	for _, sd := range services {
		svc := &devboxv1.TunnelService{Name: sd.ServiceName}
		for _, m := range sd.Methods {
			svc.Methods = append(svc.Methods, &devboxv1.TunnelMethod{Name: m.MethodName})
		}
		for _, s := range sd.Streams {
			svc.Methods = append(svc.Methods, &devboxv1.TunnelMethod{Name: s.StreamName})
		}
		d.Services = append(d.Services, svc)
	}
	return d
}

// Backoff is exponential with full jitter in [d/2, d].
type Backoff struct {
	Initial time.Duration
	Max     time.Duration
}

func (b Backoff) next(attempt int) time.Duration {
	initial, maxD := b.Initial, b.Max
	if initial <= 0 {
		initial = DefaultInitialBackoff
	}
	if maxD <= 0 {
		maxD = DefaultMaxBackoff
	}
	d := initial
	for range attempt {
		d *= 2
		if d >= maxD {
			d = maxD
			break
		}
	}
	half := d / 2
	return half + time.Duration(rand.Int64N(int64(half)+1))
}

// Config configures the tunnel pool.
type Config struct {
	// Client opens tunnels to KAS.
	Client devboxv1.TunnelClient
	// Internal is a connection to the in-process server that serves tunnelled calls (see InProcess). Frames are
	// passed through raw, so it must use RawCodec.
	Internal grpc.ClientConnInterface
	// Descriptor is sent first on every tunnel.
	Descriptor *devboxv1.TunnelAgentDescriptor

	MinIdle     int32
	MaxConns    int32
	ScaleUpStep int32
	MaxIdleTime time.Duration
	Backoff     Backoff
	Log         logr.Logger
	// OnAttempt, when set, observes the outcome of every tunnel attempt (metrics).
	OnAttempt func(err error)
}

func (c *Config) defaults() {
	if c.MinIdle <= 0 {
		c.MinIdle = DefaultMinIdle
	}
	if c.MaxConns <= 0 {
		c.MaxConns = DefaultMaxConns
	}
	if c.MaxConns < c.MinIdle {
		c.MaxConns = c.MinIdle
	}
	if c.ScaleUpStep <= 0 {
		c.ScaleUpStep = DefaultScaleUpStep
	}
	if c.MaxIdleTime <= 0 {
		c.MaxIdleTime = DefaultMaxIdleTime
	}
	if c.Log.GetSink() == nil {
		c.Log = logr.Discard()
	}
}

// Run keeps the tunnel pool open until ctx is done. Calls in flight when ctx ends run to completion.
func Run(ctx context.Context, cfg Config) {
	cfg.defaults()
	m := &manager{cfg: cfg, conns: map[*conn]*connInfo{}}
	m.run(ctx)
}

// ---- pool ----

type connState int8

const (
	_ connState = iota
	stateIdle
	stateActive
	stateStopped
)

type connInfo struct {
	pollCancel context.CancelFunc
	lastActive time.Time
	state      connState
}

type manager struct {
	cfg Config

	mu     sync.Mutex
	conns  map[*conn]*connInfo
	idle   int32
	active int32
	wg     sync.WaitGroup
}

func (m *manager) run(ctx context.Context) {
	m.mu.Lock()
	for m.idle < m.cfg.MinIdle {
		m.startLocked(ctx)
	}
	m.mu.Unlock()
	<-ctx.Done()
	m.wg.Wait()
}

func (m *manager) startLocked(rootCtx context.Context) {
	m.idle++
	c := &conn{cfg: &m.cfg}
	c.onActive = func() { m.onActive(rootCtx, c) }
	c.onIdle = func() { m.onIdle(c) }
	pollCtx, pollCancel := context.WithCancel(rootCtx)
	m.conns[c] = &connInfo{pollCancel: pollCancel, state: stateIdle, lastActive: time.Now()}
	m.wg.Add(1)
	go func() {
		defer m.wg.Done()
		defer m.onStop(c)
		c.run(rootCtx, pollCtx)
	}()
}

func (m *manager) onActive(rootCtx context.Context, c *conn) {
	m.mu.Lock()
	defer m.mu.Unlock()
	i := m.conns[c]
	if i == nil || i.state != stateIdle {
		return
	}
	i.state = stateActive
	m.idle--
	m.active++
	if m.idle < m.cfg.MinIdle && rootCtx.Err() == nil {
		scale := min(m.cfg.ScaleUpStep, m.cfg.MaxConns-(m.idle+m.active))
		for ; scale > 0; scale-- {
			m.startLocked(rootCtx)
		}
	}
}

func (m *manager) onIdle(c *conn) {
	m.mu.Lock()
	defer m.mu.Unlock()
	i := m.conns[c]
	if i == nil {
		return
	}
	switch i.state {
	case stateIdle:
		// The tunnel ended without carrying a call; stop surplus idle tunnels.
		if m.idle > m.cfg.MinIdle && time.Since(i.lastActive) > m.cfg.MaxIdleTime {
			i.pollCancel()
			m.idle--
			i.state = stateStopped
		}
	case stateActive:
		i.state = stateIdle
		i.lastActive = time.Now()
		m.idle++
		m.active--
	}
}

func (m *manager) onStop(c *conn) {
	m.mu.Lock()
	defer m.mu.Unlock()
	i := m.conns[c]
	delete(m.conns, c)
	if i == nil {
		return
	}
	switch i.state {
	case stateIdle:
		m.idle--
	case stateActive:
		m.active--
	}
}

// ---- one tunnel ----

type conn struct {
	cfg      *Config
	onActive func()
	onIdle   func()
}

var proxyStreamDesc = grpc.StreamDesc{ServerStreams: true, ClientStreams: true}

// run re-establishes the tunnel after every call (immediately) or failure (with backoff) until pollCtx is done.
// attemptCtx bounds waiting for a call; a call that started finishes even when it is canceled.
func (c *conn) run(attemptCtx, pollCtx context.Context) {
	failures := 0
	for pollCtx.Err() == nil {
		err := c.attempt(attemptCtx)
		if c.cfg.OnAttempt != nil {
			c.cfg.OnAttempt(err)
		}
		// A served call, or KAS closing an idle tunnel: reconnect immediately.
		if err == nil || canceledOrTimedOut(err) {
			failures = 0
			continue
		}
		d := c.cfg.Backoff.next(failures)
		failures++
		c.cfg.Log.Error(err, "tunnel failed", "retryIn", d.String())
		t := time.NewTimer(d)
		select {
		case <-pollCtx.Done():
			t.Stop()
			return
		case <-t.C:
		}
	}
}

func canceledOrTimedOut(err error) bool {
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return true
	}
	switch status.Code(err) {
	case codes.Canceled, codes.DeadlineExceeded:
		return true
	}
	return false
}

func (c *conn) attempt(ctx context.Context) error {
	defer c.onIdle()
	ctx, cancel, stopPropagation := propagateUntil(ctx)
	defer cancel()

	tun, err := c.cfg.Client.Connect(ctx, grpc.WaitForReady(true))
	if err != nil {
		return fmt.Errorf("connect: %w", err)
	}
	err = tun.Send(&devboxv1.TunnelConnectRequest{Msg: &devboxv1.TunnelConnectRequest_Descriptor_{
		Descriptor_: &devboxv1.TunnelDescriptor{AgentDescriptor: c.cfg.Descriptor},
	}})
	if err != nil {
		if errors.Is(err, io.EOF) {
			_, err = tun.Recv()
		}
		return fmt.Errorf("send descriptor: %w", err)
	}

	var (
		stream grpc.ClientStream
		g      errgroup.Group
	)
	recvErr := func() error {
		for {
			msg, err := tun.Recv()
			if errors.Is(err, io.EOF) {
				return nil
			}
			if err != nil {
				return err
			}
			switch m := msg.GetMsg().(type) {
			case *devboxv1.TunnelConnectResponse_RequestInfo:
				if stream != nil {
					return status.Error(codes.Internal, "unexpected second request_info on a tunnel")
				}
				c.onActive()
				outCtx := metadata.NewOutgoingContext(ctx, toMD(m.RequestInfo.GetMeta()))
				stream, err = c.cfg.Internal.NewStream(outCtx, &proxyStreamDesc, m.RequestInfo.GetMethodName())
				if err != nil {
					return fmt.Errorf("internal NewStream: %w", err)
				}
				// The call is running; cancellation must no longer interrupt it.
				stopPropagation()
				g.Go(func() error { return pipeToTunnel(tun, stream) })
			case *devboxv1.TunnelConnectResponse_Message:
				if stream == nil {
					return status.Error(codes.Internal, "message before request_info")
				}
				if err := stream.SendMsg(&RawFrame{Data: m.Message.GetData()}); err != nil {
					if errors.Is(err, io.EOF) {
						continue // the server side ended; pipeToTunnel reports it
					}
					return fmt.Errorf("internal SendMsg: %w", err)
				}
			case *devboxv1.TunnelConnectResponse_CloseSend:
				if stream == nil {
					return status.Error(codes.Internal, "close_send before request_info")
				}
				if err := stream.CloseSend(); err != nil {
					return fmt.Errorf("internal CloseSend: %w", err)
				}
			default:
				return status.Errorf(codes.Internal, "unexpected tunnel frame %T", m)
			}
		}
	}()
	if recvErr != nil {
		cancel()
	}
	if err := g.Wait(); recvErr == nil {
		recvErr = err
	}
	return recvErr
}

func pipeToTunnel(tun devboxv1.Tunnel_ConnectClient, stream grpc.ClientStream) error {
	header, err := stream.Header()
	if err != nil {
		return sendError(tun, err)
	}
	if err := tun.Send(&devboxv1.TunnelConnectRequest{Msg: &devboxv1.TunnelConnectRequest_Header{
		Header: &devboxv1.TunnelHeader{Meta: fromMD(header)},
	}}); err != nil {
		if errors.Is(err, io.EOF) {
			return nil
		}
		return fmt.Errorf("send header: %w", err)
	}
	for {
		var frame RawFrame
		recvErr := stream.RecvMsg(&frame)
		if recvErr != nil {
			if !errors.Is(recvErr, io.EOF) {
				return sendError(tun, recvErr)
			}
			if err := tun.Send(&devboxv1.TunnelConnectRequest{Msg: &devboxv1.TunnelConnectRequest_Trailer{
				Trailer: &devboxv1.TunnelTrailer{Meta: fromMD(stream.Trailer())},
			}}); err != nil && !errors.Is(err, io.EOF) {
				return fmt.Errorf("send trailer: %w", err)
			}
			return tun.CloseSend()
		}
		if err := tun.Send(&devboxv1.TunnelConnectRequest{Msg: &devboxv1.TunnelConnectRequest_Message{
			Message: &devboxv1.TunnelMessage{Data: frame.Data},
		}}); err != nil {
			if errors.Is(err, io.EOF) {
				return nil
			}
			return fmt.Errorf("send message: %w", err)
		}
	}
}

func sendError(tun devboxv1.Tunnel_ConnectClient, callErr error) error {
	st := status.Convert(callErr).Proto()
	if err := tun.Send(&devboxv1.TunnelConnectRequest{Msg: &devboxv1.TunnelConnectRequest_Error{
		Error: &devboxv1.TunnelError{Status: &devboxv1.TunnelStatus{Code: st.GetCode(), Message: st.GetMessage(), Details: st.GetDetails()}},
	}}); err != nil {
		if errors.Is(err, io.EOF) {
			return nil
		}
		return fmt.Errorf("send error: %w", err)
	}
	return tun.CloseSend()
}

// propagateUntil propagates ctx's cancellation to the returned context until stop is called.
func propagateUntil(ctx context.Context) (context.Context, context.CancelFunc, func()) {
	inner, cancel := context.WithCancel(context.Background())
	stop := make(chan struct{})
	go func() {
		select {
		case <-ctx.Done():
			cancel()
		case <-inner.Done():
		case <-stop:
		}
	}()
	var once sync.Once
	return inner, cancel, func() { once.Do(func() { close(stop) }) }
}

func toMD(m map[string]*devboxv1.MetadataValues) metadata.MD {
	md := metadata.MD{}
	for k, v := range m {
		md[k] = append([]string(nil), v.GetValue()...)
	}
	return md
}

func fromMD(md metadata.MD) map[string]*devboxv1.MetadataValues {
	out := make(map[string]*devboxv1.MetadataValues, len(md))
	for k, v := range md {
		out[k] = &devboxv1.MetadataValues{Value: v}
	}
	return out
}

// ---- raw codec ----

// RawFrame is an undecoded gRPC message.
type RawFrame struct {
	Data []byte
}

// RawCodec passes RawFrame bytes through unchanged. It is named "proto" so peers see an ordinary protobuf call.
type RawCodec struct{}

var _ encoding.CodecV2 = RawCodec{}

func (RawCodec) Marshal(v any) (mem.BufferSlice, error) {
	f, ok := v.(*RawFrame)
	if !ok {
		return nil, fmt.Errorf("RawCodec: unexpected message type %T", v)
	}
	return mem.BufferSlice{mem.SliceBuffer(f.Data)}, nil
}

func (RawCodec) Unmarshal(data mem.BufferSlice, v any) error {
	f, ok := v.(*RawFrame)
	if !ok {
		return fmt.Errorf("RawCodec: unexpected message type %T", v)
	}
	f.Data = data.Materialize()
	return nil
}

func (RawCodec) Name() string { return "proto" }
