package tunnel

import (
	"context"
	"net"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/test/bufconn"
)

// InProcess is an in-memory gRPC server that serves tunnelled calls, plus a raw-codec connection to it.
type InProcess struct {
	Server *grpc.Server
	lis    *bufconn.Listener
	conn   *grpc.ClientConn
}

// NewInProcess starts a server; register adds services to it before it starts serving.
func NewInProcess(register func(grpc.ServiceRegistrar), opts ...grpc.ServerOption) (*InProcess, error) {
	opts = append([]grpc.ServerOption{grpc.MaxRecvMsgSize(maxMessageSize), grpc.MaxSendMsgSize(maxMessageSize)}, opts...)
	srv := grpc.NewServer(opts...)
	register(srv)
	lis := bufconn.Listen(1 << 20)
	go func() { _ = srv.Serve(lis) }()
	conn, err := grpc.NewClient("passthrough:///gateway",
		grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) { return lis.DialContext(ctx) }),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithDefaultCallOptions(grpc.ForceCodecV2(RawCodec{}), grpc.MaxCallRecvMsgSize(maxMessageSize), grpc.MaxCallSendMsgSize(maxMessageSize)),
	)
	if err != nil {
		srv.Stop()
		return nil, err
	}
	return &InProcess{Server: srv, lis: lis, conn: conn}, nil
}

// Conn is the raw-codec connection for Config.Internal.
func (p *InProcess) Conn() *grpc.ClientConn { return p.conn }

// Stop waits for running calls, then stops the server. Stop the tunnel pool first.
func (p *InProcess) Stop() {
	p.Server.GracefulStop()
	_ = p.conn.Close()
}
