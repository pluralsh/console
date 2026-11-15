package tunnel

import (
	"context"
	"errors"
	"net"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"google.golang.org/grpc/test/bufconn"
	"google.golang.org/protobuf/proto"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

// fakeKAS fails the first failFirst tunnels, then sends each queued call down one tunnel and reports the
// gateway's answer.
type fakeKAS struct {
	devboxv1.UnimplementedTunnelServer

	failFirst  int32
	attempts   atomic.Int32
	attemptAt  chan time.Time
	calls      chan call
	results    chan result
	descriptor atomic.Pointer[devboxv1.TunnelAgentDescriptor]
	tokens     chan string
}

type call struct {
	method string
	req    proto.Message
	meta   map[string]*devboxv1.MetadataValues
}

type result struct {
	header  map[string]*devboxv1.MetadataValues
	msgs    [][]byte
	trailer bool
	err     *devboxv1.TunnelStatus
}

func (k *fakeKAS) Connect(stream devboxv1.Tunnel_ConnectServer) error {
	n := k.attempts.Add(1)
	select {
	case k.attemptAt <- time.Now():
	default:
	}
	if md, ok := metadata.FromIncomingContext(stream.Context()); ok {
		select {
		case k.tokens <- first(md.Get("authorization")):
		default:
		}
	}
	if n <= k.failFirst {
		return status.Error(codes.Unavailable, "kas is down")
	}
	first, err := stream.Recv()
	if err != nil {
		return err
	}
	k.descriptor.Store(first.GetDescriptor_().GetAgentDescriptor())

	var c call
	select {
	case c = <-k.calls:
	case <-stream.Context().Done():
		return nil
	}
	data, _ := proto.Marshal(c.req)
	_ = stream.Send(&devboxv1.TunnelConnectResponse{Msg: &devboxv1.TunnelConnectResponse_RequestInfo{RequestInfo: &devboxv1.TunnelRequestInfo{MethodName: c.method, Meta: c.meta}}})
	_ = stream.Send(&devboxv1.TunnelConnectResponse{Msg: &devboxv1.TunnelConnectResponse_Message{Message: &devboxv1.TunnelMessage{Data: data}}})
	_ = stream.Send(&devboxv1.TunnelConnectResponse{Msg: &devboxv1.TunnelConnectResponse_CloseSend{CloseSend: &devboxv1.TunnelCloseSend{}}})

	var r result
	for {
		msg, err := stream.Recv()
		if err != nil {
			break
		}
		switch m := msg.GetMsg().(type) {
		case *devboxv1.TunnelConnectRequest_Header:
			r.header = m.Header.GetMeta()
		case *devboxv1.TunnelConnectRequest_Message:
			r.msgs = append(r.msgs, m.Message.GetData())
		case *devboxv1.TunnelConnectRequest_Trailer:
			r.trailer = true
		case *devboxv1.TunnelConnectRequest_Error:
			r.err = m.Error.GetStatus()
		}
	}
	k.results <- r
	return nil
}

func first(v []string) string {
	if len(v) == 0 {
		return ""
	}
	return v[0]
}

type fakeGateway struct {
	devboxv1.UnimplementedGatewayServer
	mu   sync.Mutex
	seen []string
}

func (g *fakeGateway) GetSessions(ctx context.Context, req *devboxv1.GetSessionsRequest) (*devboxv1.GetSessionsResponse, error) {
	md, _ := metadata.FromIncomingContext(ctx)
	g.mu.Lock()
	g.seen = append(g.seen, first(md.Get("devbox-request-token")))
	g.mu.Unlock()
	_ = grpc.SetHeader(ctx, metadata.Pairs("x-served-by", "fake"))
	return &devboxv1.GetSessionsResponse{Sessions: []*devboxv1.Session{{SessionId: "s-" + req.GetInstanceId()}}}, nil
}

func startKAS(t *testing.T, k *fakeKAS) *grpc.ClientConn {
	t.Helper()
	lis := bufconn.Listen(1 << 20)
	srv := grpc.NewServer()
	devboxv1.RegisterTunnelServer(srv, k)
	go func() { _ = srv.Serve(lis) }()
	t.Cleanup(srv.Stop)
	conn, err := Dial(DialConfig{
		URL:   "passthrough:///kas",
		Token: func() (string, error) { return "deploy-token", nil },
		Options: []grpc.DialOption{grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) {
			return lis.DialContext(ctx)
		})},
	})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = conn.Close() })
	return conn
}

func newKAS(failFirst int32) *fakeKAS {
	return &fakeKAS{
		failFirst: failFirst,
		attemptAt: make(chan time.Time, 64),
		calls:     make(chan call, 8),
		results:   make(chan result, 8),
		tokens:    make(chan string, 64),
	}
}

func TestTunnelReconnectsWithBackoffAndServesCalls(t *testing.T) {
	k := newKAS(3)
	kasConn := startKAS(t, k)
	gw := &fakeGateway{}
	internal, err := NewInProcess(func(s grpc.ServiceRegistrar) { devboxv1.RegisterGatewayServer(s, gw) })
	if err != nil {
		t.Fatal(err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		defer close(done)
		Run(ctx, Config{
			Client:     devboxv1.NewTunnelClient(kasConn),
			Internal:   internal.Conn(),
			Descriptor: Descriptor(&devboxv1.Gateway_ServiceDesc),
			MinIdle:    1,
			MaxConns:   2,
			Backoff:    Backoff{Initial: 40 * time.Millisecond, Max: 200 * time.Millisecond},
		})
	}()

	// Three failures, each followed by a growing backoff, then a connected tunnel.
	var times []time.Time
	for len(times) < 4 {
		select {
		case at := <-k.attemptAt:
			times = append(times, at)
		case <-time.After(5 * time.Second):
			t.Fatalf("only %d tunnel attempts", len(times))
		}
	}
	gap1, gap3 := times[1].Sub(times[0]), times[3].Sub(times[2])
	if gap1 < 20*time.Millisecond {
		t.Errorf("first retry after %s, want >= 20ms (backoff)", gap1)
	}
	if gap3 < 80*time.Millisecond {
		t.Errorf("third retry after %s, want >= 80ms (exponential backoff)", gap3)
	}
	if tok := <-k.tokens; tok != "Bearer deploy-token" {
		t.Errorf("authorization = %q", tok)
	}

	k.calls <- call{
		method: devboxv1.Gateway_GetSessions_FullMethodName,
		req:    &devboxv1.GetSessionsRequest{InstanceId: "i1"},
		meta:   map[string]*devboxv1.MetadataValues{"devbox-request-token": {Value: []string{"tok"}}},
	}
	r := waitResult(t, k)
	if r.err != nil {
		t.Fatalf("call failed: %v", r.err)
	}
	if len(r.msgs) != 1 || r.header["x-served-by"] == nil || !r.trailer {
		t.Fatalf("frames = %+v", r)
	}
	resp := &devboxv1.GetSessionsResponse{}
	if err := proto.Unmarshal(r.msgs[0], resp); err != nil || resp.GetSessions()[0].GetSessionId() != "s-i1" {
		t.Fatalf("response = %v, %v", resp, err)
	}
	gw.mu.Lock()
	if len(gw.seen) != 1 || gw.seen[0] != "tok" {
		t.Errorf("metadata not forwarded: %v", gw.seen)
	}
	gw.mu.Unlock()

	// The tunnel is re-established after the call; an unimplemented method comes back as an error frame.
	k.calls <- call{method: devboxv1.Gateway_DeleteSnapshot_FullMethodName, req: &devboxv1.DeleteSnapshotRequest{}}
	r = waitResult(t, k)
	if r.err == nil || codes.Code(r.err.GetCode()) != codes.Unimplemented {
		t.Fatalf("expected Unimplemented error frame, got %+v", r)
	}

	desc := k.descriptor.Load()
	if desc.GetServices()[0].GetName() != "devbox.v1.Gateway" || len(desc.GetServices()[0].GetMethods()) != len(devboxv1.Gateway_ServiceDesc.Methods)+1 {
		t.Fatalf("descriptor = %v", desc)
	}

	cancel()
	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("Run did not return after cancel")
	}
	internal.Stop()
}

func waitResult(t *testing.T, k *fakeKAS) result {
	t.Helper()
	select {
	case r := <-k.results:
		return r
	case <-time.After(5 * time.Second):
		t.Fatal("no result from the gateway")
		return result{}
	}
}

func TestBackoffBounds(t *testing.T) {
	b := Backoff{Initial: 100 * time.Millisecond, Max: time.Second}
	for attempt := range 10 {
		d := b.next(attempt)
		want := min(100*time.Millisecond<<attempt, time.Second)
		if d < want/2 || d > want {
			t.Fatalf("attempt %d: %s not in [%s, %s]", attempt, d, want/2, want)
		}
	}
}

func TestRawCodecRejectsOtherTypes(t *testing.T) {
	if _, err := (RawCodec{}).Marshal(&devboxv1.GetSessionsRequest{}); err == nil {
		t.Fatal("expected an error")
	}
	if !errors.Is(context.Canceled, context.Canceled) || !canceledOrTimedOut(status.Error(codes.Canceled, "x")) {
		t.Fatal("canceledOrTimedOut")
	}
}
