package console

import (
	"context"
	"fmt"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	pb "github.com/pluralsh/console/go/observability-proxy/internal/proto"
)

// Client fetches observability configuration from Console.
type Client interface {
	GetObservabilityConfig(ctx context.Context) (*pb.ObservabilityConfig, error)
	Close() error
}

type grpcClient struct {
	timeout time.Duration
	conn    *grpc.ClientConn
	client  pb.PluralServerClient
}

func NewGRPCClient(endpoint string, timeout time.Duration) (Client, error) {
	conn, err := grpc.NewClient(endpoint,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithDefaultCallOptions(
			grpc.MaxCallRecvMsgSize(10*1024*1024),
			grpc.MaxCallSendMsgSize(10*1024*1024),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("create grpc client: %w", err)
	}

	return &grpcClient{
		timeout: timeout,
		conn:    conn,
		client:  pb.NewPluralServerClient(conn),
	}, nil
}

func (c *grpcClient) GetObservabilityConfig(ctx context.Context) (*pb.ObservabilityConfig, error) {
	reqCtx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	resp, err := c.client.GetObservabilityConfig(reqCtx, &pb.ObservabilityConfigRequest{})
	if err != nil {
		return nil, fmt.Errorf("get observability config: %w", err)
	}

	return resp, nil
}

func (c *grpcClient) Close() error {
	if c.conn == nil {
		return nil
	}

	return c.conn.Close()
}
