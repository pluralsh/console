package server

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/keepalive"
	"google.golang.org/grpc/reflection"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/cloud-query/internal/log"
)

// Server represents a gRPC server instance
type Server struct {
	config  *Config
	server  *grpc.Server
	routes  []Route
	stopped chan struct{} // Channel to signal when server is stopped
}

// Start initializes and starts the gRPC server
func (in *Server) Start(ctx context.Context) error {
	// Start listening on the configured address
	lis, err := net.Listen("tcp", in.config.Address)
	if err != nil {
		return fmt.Errorf("failed to listen on %s: %w", in.config.Address, err)
	}

	klog.InfoS("gRPC server starting", "address", in.config.Address)
	go func() {
		if err := in.server.Serve(lis); err != nil {
			klog.ErrorS(err, "failed to serve")
		}
	}()

	// Wait for the context to be canceled or for a shutdown signal
	<-ctx.Done()

	// Gracefully stop the server
	in.Stop()
	return nil
}

// Stop gracefully shuts down the server
func (in *Server) Stop() {
	klog.Info("stopping gRPC server")
	go func() {
		in.server.GracefulStop()
		close(in.stopped)
	}()

	// Wait for a graceful stop with a timeout
	timeout := time.After(10 * time.Second)
	select {
	case <-in.stopped:
		klog.Info("gRPC server stopped gracefully")
	case <-timeout:
		klog.Info("timeout waiting for server to stop, forcing shutdown")
		in.server.Stop()
	}
}

func (in *Server) register() {
	for _, route := range in.routes {
		route.Install(in.server)
	}

	klog.V(log.LogLevelVerbose).InfoS("gRPC services registered", "count", len(in.routes))
}

func (in *Server) init() (*Server, error) {
	opts := []grpc.ServerOption{
		grpc.KeepaliveParams(keepalive.ServerParameters{
			MaxConnectionAge:      in.config.MaxConnectionAge,
			MaxConnectionAgeGrace: in.config.MaxConnectionAgeGrace,
			Time:                  in.config.KeepAlive,
			Timeout:               in.config.KeepAliveTimeout,
		}),
	}

	// Add TLS credentials if certificates are provided
	if in.config.TLSCertPath != "" && in.config.TLSKeyPath != "" {
		cert, err := tls.LoadX509KeyPair(in.config.TLSCertPath, in.config.TLSKeyPath)
		if err != nil {
			return nil, err
		}
		opts = append(opts, grpc.Creds(credentials.NewServerTLSFromCert(&cert)))
	}

	// Create the gRPC server
	in.server = grpc.NewServer(opts...)
	in.register()

	// Enable reflection service for debugging and tools like grpcurl
	// TODO: use args to conditionally enable reflection
	reflection.Register(in.server)

	return in, nil
}

// New creates and returns a new Server with the provided configuration
func New(config *Config, routes ...Route) (*Server, error) {
	if config == nil {
		config = DefaultConfig()
	}

	if err := config.Sanitize(); err != nil {
		return nil, fmt.Errorf("invalid server configuration: %w", err)
	}

	return (&Server{
		config:  config,
		routes:  routes,
		stopped: make(chan struct{}),
	}).init()
}
