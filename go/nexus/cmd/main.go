package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"go.uber.org/zap"

	"github.com/pluralsh/console/go/nexus/cmd/args"
	"github.com/pluralsh/console/go/nexus/internal/config"
	"github.com/pluralsh/console/go/nexus/internal/console"
	"github.com/pluralsh/console/go/nexus/internal/log"
	"github.com/pluralsh/console/go/nexus/internal/server"
	"github.com/pluralsh/console/go/nexus/internal/version"
)

func main() {
	// Handle version flag early (before Init for quick response)
	if args.Version() {
		fmt.Println(version.Info())
		os.Exit(0)
	}

	// Initialize args and load configuration
	if err := args.Init(); err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "failed to initialize configuration: %v\n", err)
		os.Exit(1)
	}

	// Ensure logger is flushed on exit
	defer log.Sync()

	// Start the server
	if err := serve(); err != nil {
		log.Logger().Error("failed to start server", zap.Error(err))
		os.Exit(1)
	}
}

// serve implements the serve command
func serve() error {
	logger := log.Logger()
	cfg := args.Config()

	logger.Info("initializing Nexus server",
		zap.String("version", version.Version),
		zap.String("log_level", cfg.Observability.LogLevel),
		zap.String("server_address", cfg.Server.Address),
		zap.String("console_endpoint", cfg.Console.GRPCEndpoint),
		zap.Duration("config_ttl", cfg.Console.ConfigTTL),
	)

	if err := config.Validate(cfg); err != nil {
		return fmt.Errorf("invalid configuration: %w", err)
	}
	logger.Info("configuration loaded successfully")

	logger.Info("connecting to Console gRPC", zap.String("endpoint", cfg.Console.GRPCEndpoint))
	consoleClient, err := console.NewRetryableClient(&cfg.Console)
	if err != nil {
		return fmt.Errorf("failed to create Console client: %w", err)
	}
	defer func() {
		if err := consoleClient.Close(); err != nil {
			logger.Error("failed to close Console client", zap.Error(err))
		}
	}()

	logger.Info("starting HTTP server", zap.String("address", cfg.Server.Address))
	srv := server.New(&cfg.Server, consoleClient)
	ctx := context.Background()
	readyChan, err := srv.Start(ctx)
	if err != nil {
		return fmt.Errorf("failed to start server: %w", err)
	}

	// Wait for server to be ready
	<-readyChan

	logger.Info("Nexus server started successfully",
		zap.String("address", srv.Addr()),
		zap.String("health_endpoint", fmt.Sprintf("http://%s/health", srv.Addr())),
		zap.String("ready_endpoint", fmt.Sprintf("http://%s/ready", srv.Addr())),
	)

	// Setup signal handling for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	// Wait for shutdown signal
	sig := <-sigChan
	logger.Info("received shutdown signal", zap.String("signal", sig.String()))

	// Graceful shutdown with timeout
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	logger.Info("shutting down server gracefully...")
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("server shutdown failed: %w", err)
	}

	logger.Info("server shutdown complete")
	return nil
}
