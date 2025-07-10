package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/cloud-query/cmd/args"
	"github.com/pluralsh/console/go/cloud-query/internal/pool"
	"github.com/pluralsh/console/go/cloud-query/internal/server"
	"github.com/pluralsh/console/go/cloud-query/internal/service"
)

func main() {
	p, err := pool.NewConnectionPool(args.DatabaseConnectionTTL())
	if err != nil {
		klog.Fatalf("failed to create connection pool: %v", err)
	}

	s, err := server.New(&server.Config{
		Address:          args.ServerAddress(),
		TLSCertPath:      args.ServerTLSCertPath(),
		TLSKeyPath:       args.ServerTLSKeyPath(),
		EnableReflection: args.ServerEnableReflection(),
	}, service.NewCloudQueryService(p))
	if err != nil {
		klog.Fatalf("failed to create server: %v", err)
	}

	// Setup signal handling for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	go handleShutdown(cancel, s)

	if err = s.Start(ctx); err != nil {
		klog.Fatalf("failed to start server: %v", err)
	}
}

func handleShutdown(cancel context.CancelFunc, s *server.Server) {
	signalChan := make(chan os.Signal, 1)
	signal.Notify(signalChan, syscall.SIGINT, syscall.SIGTERM)

	<-signalChan
	klog.Info("received shutdown signal, shutting down gracefully...")

	s.Stop()
	cancel()
	klog.Info("stopped gracefully")
	os.Exit(0)
}
