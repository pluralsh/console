package console

import (
	"context"
	"fmt"
	"time"

	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/keepalive"

	"github.com/pluralsh/console/go/nexus/internal/config"
	"github.com/pluralsh/console/go/nexus/internal/log"
	pb "github.com/pluralsh/console/go/nexus/internal/proto"
)

// Client defines the interface for Console gRPC client operations
type Client interface {
	// GetAiConfig retrieves the AI configuration from Console
	GetAiConfig(ctx context.Context) (*pb.AiConfig, error)

	// ProxyAuthentication authenticates a request token with Console
	ProxyAuthentication(ctx context.Context, token string) (bool, error)

	// IsConnected checks if the connection is still alive
	IsConnected() bool

	// Close closes the gRPC connection
	Close() error
}

// client is a wrapper around the Console gRPC client
type client struct {
	conn       *grpc.ClientConn
	grpcClient pb.PluralServerClient
	config     *config.ConsoleConfig
	logger     *zap.Logger
	cache      *clientCache
}

func (c *client) init() error {
	conn, err := c.createConnection(c.config, c.logger)
	if err != nil {
		return fmt.Errorf("failed to create gRPC connection: %w", err)
	}

	c.conn = conn
	c.grpcClient = pb.NewPluralServerClient(conn)

	// Verify connection health
	if err = c.healthCheck(context.Background()); err != nil {
		if closeErr := conn.Close(); closeErr != nil {
			c.logger.Error("failed to close connection after health check failure", zap.Error(closeErr))
		}
		return fmt.Errorf("health check failed: %w", err)
	}

	c.cache = newClientCache(c.getAiConfig, c.config.ConfigTTL)
	c.logger.Info("console gRPC client connected", zap.String("endpoint", c.config.GRPCEndpoint))
	return nil
}

// createConnection creates a gRPC connection with appropriate credentials and settings
func (c *client) createConnection(cfg *config.ConsoleConfig, _ *zap.Logger) (*grpc.ClientConn, error) {
	// Prepare dial options
	var opts []grpc.DialOption

	// Configure credentials
	opts = append(opts, grpc.WithTransportCredentials(insecure.NewCredentials()))

	// Configure keep-alive
	keepaliveParams := keepalive.ClientParameters{
		Time:                10 * time.Second, // Send keepalive pings every 10 seconds
		Timeout:             3 * time.Second,  // Wait 3 seconds for keepalive ack
		PermitWithoutStream: true,             // Allow keepalive pings even without active streams
	}
	opts = append(opts, grpc.WithKeepaliveParams(keepaliveParams))

	// Set default call options
	opts = append(opts,
		grpc.WithDefaultCallOptions(
			grpc.MaxCallRecvMsgSize(10*1024*1024), // 10MB max receive message size
			grpc.MaxCallSendMsgSize(10*1024*1024), // 10MB max send message size
		),
	)

	// Create connection
	conn, err := grpc.NewClient(cfg.GRPCEndpoint, opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to create client for %s: %w", cfg.GRPCEndpoint, err)
	}

	return conn, nil
}

// healthCheck performs a simple health check by calling GetAiConfig
func (c *client) healthCheck(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	// Try to call GetAiConfig - if it succeeds or fails with expected error, connection is healthy
	_, err := c.grpcClient.GetAiConfig(ctx, &pb.AiConfigRequest{})
	if err != nil {
		return fmt.Errorf("health check GetAiConfig failed: %w", err)
	}

	return nil
}

// Close closes the gRPC connection
func (c *client) Close() error {
	if c.conn != nil {
		c.logger.Info("closing console gRPC connection")
		return c.conn.Close()
	}
	return nil
}

// GetAiConfig retrieves the AI configuration from Console
func (c *client) GetAiConfig(ctx context.Context) (*pb.AiConfig, error) {
	return c.cache.GetAiConfig(ctx)
}

func (c *client) getAiConfig(ctx context.Context) (*pb.AiConfig, error) {
	// Apply request timeout
	ctx, cancel := context.WithTimeout(ctx, c.config.RequestTimeout)
	defer cancel()

	aiConfig, err := c.grpcClient.GetAiConfig(ctx, &pb.AiConfigRequest{})
	if err != nil {
		return nil, fmt.Errorf("could not get AI config: %w", err)
	}

	return aiConfig, nil
}

// ProxyAuthentication authenticates a request token with Console
func (c *client) ProxyAuthentication(ctx context.Context, token string) (bool, error) {
	// Apply request timeout
	ctx, cancel := context.WithTimeout(ctx, c.config.RequestTimeout)
	defer cancel()

	c.logger.Debug("calling ProxyAuthentication")

	resp, err := c.grpcClient.ProxyAuthentication(ctx, &pb.ProxyAuthenticationRequest{
		Token: token,
	})
	if err != nil {
		c.logger.Debug("ProxyAuthentication failed", zap.Error(err))
		return false, fmt.Errorf("ProxyAuthentication failed: %w", err)
	}

	c.logger.Debug("ProxyAuthentication succeeded", zap.Bool("authenticated", resp.Authenticated))

	return resp.Authenticated, nil
}

// IsConnected checks if the connection is still alive
func (c *client) IsConnected() bool {
	if c.conn == nil {
		return false
	}

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	err := c.healthCheck(ctx)
	return err == nil
}

// NewClient creates a new Console gRPC client
func NewClient(cfg *config.ConsoleConfig) (Client, error) {
	logger := log.Logger().With(zap.String("component", "console-client"))

	c := &client{
		config: cfg,
		logger: logger,
	}

	if err := c.init(); err != nil {
		return nil, err
	}

	return c, nil
}
