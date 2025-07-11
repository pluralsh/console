package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	embeddedpostgres "github.com/fergusstrange/embedded-postgres"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/cloud-query/cmd/args"
	"github.com/pluralsh/console/go/cloud-query/internal/connection"
	"github.com/pluralsh/console/go/cloud-query/internal/extension"
	"github.com/pluralsh/console/go/cloud-query/internal/pool"
	"github.com/pluralsh/console/go/cloud-query/internal/server"
	"github.com/pluralsh/console/go/cloud-query/internal/service"
)

func main() {
	db := setupDatabaseOrDie()

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
	go handleShutdown(cancel, db, s)

	if err = s.Start(ctx); err != nil {
		klog.Fatalf("failed to start server: %v", err)
	}
}

func setupDatabaseOrDie() *embeddedpostgres.EmbeddedPostgres {
	db := embeddedpostgres.NewDatabase(
		embeddedpostgres.DefaultConfig().
			Username(args.DatabaseUser()).
			Password(args.DatabasePassword()).
			Database(args.DatabaseName()).
			Port(args.DatabasePort()).
			BinariesPath(args.DatabaseRuntimeDir()).
			RuntimePath(args.DatabaseRuntimeDir()).
			CachePath(args.DatabaseCacheDir()).
			DataPath(args.DatabaseDataDir()).
			Version(args.DatabaseVersion()).
			StartTimeout(args.DatabaseStartTimeout()).
			Logger(klog.NewStandardLogger("INFO").Writer()).
			StartParameters(map[string]string{"max_connections": args.DatabaseMaxConnections()}))
	err := db.Start()
	if err != nil {
		klog.Fatalf("failed to start database: %v", err)
	}

	conn, err := connection.NewConnection("register", "")
	if err != nil {
		klog.Fatalf("failed to create db connection to register extensions: %v", err)
	}

	if err = extension.Register(conn); err != nil {
		klog.Fatalf("failed to register extensions: %v", err)
	}
	err = conn.Close()
	if err != nil {
		klog.Fatalf("failed to close db connection after registering extensions: %v", err)
	}

	return db
}

func handleShutdown(cancel context.CancelFunc, db *embeddedpostgres.EmbeddedPostgres, s *server.Server) {
	signalChan := make(chan os.Signal, 1)
	signal.Notify(signalChan, syscall.SIGINT, syscall.SIGTERM)

	<-signalChan
	klog.Info("received shutdown signal, shutting down gracefully...")

	s.Stop()
	if err := db.Stop(); err != nil {
		klog.Fatalf("failed to stop database: %v", err)
	}

	cancel()
	klog.Info("stopped gracefully")
	os.Exit(0)
}
