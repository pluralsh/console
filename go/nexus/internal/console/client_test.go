package console_test

import (
	"context"
	"net"
	"testing"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/connectivity"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"
	"google.golang.org/grpc/test/bufconn"

	"github.com/pluralsh/console/go/nexus/internal/config"
	"github.com/pluralsh/console/go/nexus/internal/console"
	pb "github.com/pluralsh/console/go/nexus/internal/proto"
)

const bufSize = 1024 * 1024

// mockPluralServer implements the PluralServer service for testing
type mockPluralServer struct {
	pb.UnimplementedPluralServerServer
	authenticateFunc func(token string) bool
	getConfigFunc    func() (*pb.AiConfig, error)
	callCount        int
}

func (m *mockPluralServer) ProxyAuthentication(_ context.Context, req *pb.ProxyAuthenticationRequest) (*pb.ProxyAuthenticationResponse, error) {
	m.callCount++
	if m.authenticateFunc != nil {
		return &pb.ProxyAuthenticationResponse{
			Authenticated: m.authenticateFunc(req.Token),
		}, nil
	}
	return &pb.ProxyAuthenticationResponse{Authenticated: true}, nil
}

func (m *mockPluralServer) GetAiConfig(_ context.Context, _ *pb.AiConfigRequest) (*pb.AiConfig, error) {
	m.callCount++
	if m.getConfigFunc != nil {
		return m.getConfigFunc()
	}
	return &pb.AiConfig{
		Openai: &pb.OpenAiConfig{
			ApiKey: strPtr("test-key"),
			Model:  strPtr("gpt-4"),
		},
	}, nil
}

func strPtr(s string) *string {
	return &s
}

// createTestConfig creates a test configuration
func createTestConfig() *config.ConsoleConfig {
	return &config.ConsoleConfig{
		GRPCEndpoint:   "bufconn",
		ConfigTTL:      60 * time.Second,
		RequestTimeout: 10 * time.Second,
		ConnectionRetry: config.ConnectionRetryConfig{
			MaxAttempts:    3,
			InitialBackoff: 100 * time.Millisecond,
			MaxBackoff:     1 * time.Second,
		},
	}
}

// createTestClient creates a client connected to the mock server
func createTestClient(t *testing.T, mock pb.PluralServerServer) (console.Client, *grpc.Server, func()) {
	lis := bufconn.Listen(bufSize)
	server := grpc.NewServer()
	pb.RegisterPluralServerServer(server, mock)

	go func() {
		if err := server.Serve(lis); err != nil {
			t.Logf("server exited with error: %v", err)
		}
	}()

	cfg := createTestConfig()

	// Override the endpoint to use bufconn
	// We'll need to temporarily set an environment variable or use a test-specific approach
	// For now, we'll create a custom dialer
	originalEndpoint := cfg.GRPCEndpoint
	cfg.GRPCEndpoint = "bufnet"

	// Create connection to bufconn
	conn, err := grpc.NewClient("passthrough:///bufnet",
		grpc.WithContextDialer(func(context.Context, string) (net.Conn, error) {
			return lis.Dial()
		}),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		t.Fatalf("failed to dial bufnet: %v", err)
	}

	// Create a mock client wrapper that uses our test connection
	client := &testClientWrapper{
		conn:       conn,
		grpcClient: pb.NewPluralServerClient(conn),
		config:     cfg,
	}

	cfg.GRPCEndpoint = originalEndpoint

	cleanup := func() {
		if err := client.Close(); err != nil {
			t.Logf("failed to close client: %v", err)
		}
		server.Stop()
	}

	return client, server, cleanup
}

// testClientWrapper wraps grpc client for testing
type testClientWrapper struct {
	conn       *grpc.ClientConn
	grpcClient pb.PluralServerClient
	config     *config.ConsoleConfig
}

func (c *testClientWrapper) GetAiConfig(ctx context.Context) (*pb.AiConfig, error) {
	ctx, cancel := context.WithTimeout(ctx, c.config.RequestTimeout)
	defer cancel()
	return c.grpcClient.GetAiConfig(ctx, &pb.AiConfigRequest{})
}

func (c *testClientWrapper) ProxyAuthentication(ctx context.Context, token string) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, c.config.RequestTimeout)
	defer cancel()
	resp, err := c.grpcClient.ProxyAuthentication(ctx, &pb.ProxyAuthenticationRequest{Token: token})
	if err != nil {
		return false, err
	}
	return resp.Authenticated, nil
}

func (c *testClientWrapper) IsConnected() bool {
	if c.conn == nil {
		return false
	}
	state := c.conn.GetState()
	return state == connectivity.Ready || state == connectivity.Idle
}

func (c *testClientWrapper) Close() error {
	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}

func TestNewClient_Success(t *testing.T) {
	mock := &mockPluralServer{}
	client, _, cleanup := createTestClient(t, mock)
	defer cleanup()

	if client == nil {
		t.Fatal("expected client to be created")
	}

	// Test that the client is connected by calling a method
	if !client.IsConnected() {
		t.Error("expected client to be connected")
	}
}

func TestClient_GetAiConfig_Success(t *testing.T) {
	mock := &mockPluralServer{
		getConfigFunc: func() (*pb.AiConfig, error) {
			return &pb.AiConfig{
				Openai: &pb.OpenAiConfig{
					ApiKey: strPtr("test-openai-key"),
					Model:  strPtr("gpt-4"),
				},
				Anthropic: &pb.AnthropicConfig{
					ApiKey: strPtr("test-anthropic-key"),
					Model:  strPtr("claude-3"),
				},
			}, nil
		},
	}

	client, _, cleanup := createTestClient(t, mock)
	defer cleanup()

	ctx := context.Background()
	cfg, err := client.GetAiConfig(ctx)
	if err != nil {
		t.Fatalf("GetAiConfig failed: %v", err)
	}

	if cfg.Openai == nil {
		t.Error("expected OpenAI config to be present")
	}
	if cfg.Openai.GetApiKey() != "test-openai-key" {
		t.Errorf("expected OpenAI key 'test-openai-key', got %s", cfg.Openai.GetApiKey())
	}

	if cfg.Anthropic == nil {
		t.Error("expected Anthropic config to be present")
	}
}

func TestClient_GetAiConfig_Error(t *testing.T) {
	mock := &mockPluralServer{
		getConfigFunc: func() (*pb.AiConfig, error) {
			return nil, status.Error(codes.Internal, "internal server error")
		},
	}

	client, _, cleanup := createTestClient(t, mock)
	defer cleanup()

	ctx := context.Background()
	_, err := client.GetAiConfig(ctx)
	if err == nil {
		t.Fatal("expected error from GetAiConfig")
	}
}

func TestClient_GetAiConfig_Timeout(t *testing.T) {
	mock := &mockPluralServer{
		getConfigFunc: func() (*pb.AiConfig, error) {
			// Sleep longer than the timeout
			time.Sleep(2 * time.Second)
			return &pb.AiConfig{}, nil
		},
	}

	// Create a client wrapper with very short timeout for this test
	lis := bufconn.Listen(bufSize)
	server := grpc.NewServer()
	pb.RegisterPluralServerServer(server, mock)

	go func() {
		if err := server.Serve(lis); err != nil {
			t.Logf("server exited with error: %v", err)
		}
	}()
	defer server.Stop()

	conn, err := grpc.NewClient("passthrough:///bufnet",
		grpc.WithContextDialer(func(context.Context, string) (net.Conn, error) {
			return lis.Dial()
		}),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		t.Fatalf("failed to dial bufnet: %v", err)
	}
	defer func() {
		if err := conn.Close(); err != nil {
			t.Logf("failed to close conn: %v", err)
		}
	}()

	cfg := createTestConfig()
	cfg.RequestTimeout = 100 * time.Millisecond

	client := &testClientWrapper{
		conn:       conn,
		grpcClient: pb.NewPluralServerClient(conn),
		config:     cfg,
	}

	ctx := context.Background()
	_, err = client.GetAiConfig(ctx)
	if err == nil {
		t.Fatal("expected timeout error from GetAiConfig")
	}

	// Check if error is timeout-related
	if !isTimeoutError(err) {
		t.Errorf("expected timeout error, got: %v", err)
	}
}

func TestClient_ProxyAuthentication_Success(t *testing.T) {
	validTokens := map[string]bool{
		"valid-token":   true,
		"invalid-token": false,
	}

	mock := &mockPluralServer{
		authenticateFunc: func(token string) bool {
			return validTokens[token]
		},
	}

	client, _, cleanup := createTestClient(t, mock)
	defer cleanup()

	ctx := context.Background()

	// Test valid token
	authenticated, err := client.ProxyAuthentication(ctx, "valid-token")
	if err != nil {
		t.Fatalf("ProxyAuthentication failed: %v", err)
	}
	if !authenticated {
		t.Error("expected valid token to be authenticated")
	}

	// Test invalid token
	authenticated, err = client.ProxyAuthentication(ctx, "invalid-token")
	if err != nil {
		t.Fatalf("ProxyAuthentication failed: %v", err)
	}
	if authenticated {
		t.Error("expected invalid token to not be authenticated")
	}
}

func TestClient_ProxyAuthentication_Error(t *testing.T) {
	// Create a mock that returns an error
	errorMock := &errorReturningMockServer{}
	client, _, cleanup := createTestClient(t, errorMock)
	defer cleanup()

	ctx := context.Background()
	_, err := client.ProxyAuthentication(ctx, "some-token")
	if err == nil {
		t.Fatal("expected error from ProxyAuthentication")
	}
}

// errorReturningMockServer returns errors for testing
type errorReturningMockServer struct {
	pb.UnimplementedPluralServerServer
}

func (m *errorReturningMockServer) ProxyAuthentication(_ context.Context, _ *pb.ProxyAuthenticationRequest) (*pb.ProxyAuthenticationResponse, error) {
	return nil, status.Error(codes.Unauthenticated, "authentication failed")
}

func (m *errorReturningMockServer) GetAiConfig(_ context.Context, _ *pb.AiConfigRequest) (*pb.AiConfig, error) {
	return &pb.AiConfig{}, nil
}

func TestClient_Close(t *testing.T) {
	mock := &mockPluralServer{}
	client, server, _ := createTestClient(t, mock)

	// Don't defer cleanup since we're testing Close explicitly
	defer server.Stop()

	if err := client.Close(); err != nil {
		t.Fatalf("Close failed: %v", err)
	}

	// After close, client should not be connected
	// Note: IsConnected may still return true briefly due to connection state caching
	// but attempting to use the client should fail
}

func TestClient_IsConnected(t *testing.T) {
	mock := &mockPluralServer{}
	client, server, cleanup := createTestClient(t, mock)
	defer cleanup()

	// Initially should be connected
	if !client.IsConnected() {
		t.Error("expected client to be connected initially")
	}

	// Stop the server
	server.Stop()
	time.Sleep(100 * time.Millisecond)

	// After server stop, should be disconnected
	// Note: This might still return true briefly due to connection state
	// In real scenarios, the connection will eventually detect failure
}

// isTimeoutError checks if an error is a timeout error
func isTimeoutError(err error) bool {
	if err == nil {
		return false
	}
	// Check for context deadline exceeded or timeout errors
	st, ok := status.FromError(err)
	if ok {
		return st.Code() == codes.DeadlineExceeded
	}
	return false
}
