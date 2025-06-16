package main

import (
	"context"
	"os"
	"os/signal"

	"github.com/fergusstrange/embedded-postgres"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/cloud-query/cmd/args"
	"github.com/pluralsh/console/go/cloud-query/internal/connection"
	_ "github.com/pluralsh/console/go/cloud-query/internal/connection"
	"github.com/pluralsh/console/go/cloud-query/internal/extension"
	"github.com/pluralsh/console/go/cloud-query/internal/pool"
	"github.com/pluralsh/console/go/cloud-query/internal/server"
)

func main() {
	db := embeddedpostgres.NewDatabase(
		embeddedpostgres.DefaultConfig().
			Port(args.DatabasePort()).
			BinariesPath(args.DatabaseDir()).
			RuntimePath(args.DatabaseDir()).
			Version(args.DatabaseVersion()).
			// TODO: export to args
			StartParameters(map[string]string{"max_connections": "200"}))
	err := db.Start()
	if err != nil {
		klog.Fatalf("failed to start database: %v", err)
	}
	defer func() {
		if err = db.Stop(); err != nil {
			klog.Fatalf("failed to stop database: %v", err)
		}
	}()

	conn, err := connection.NewConnection("register")
	if err != nil {
		klog.Fatalf("failed to create db connection to register extensions: %v", err)
	}

	if err = extension.Register(conn); err != nil {
		klog.Fatalf("failed to register extensions: %v", err)
	}

	p := pool.NewConnectionPool(args.ConnectionTTL())
	s, err := server.New(nil, server.NewCloudQueryServer(p))
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

func handleShutdown(cancel context.CancelFunc, db *embeddedpostgres.EmbeddedPostgres, s *server.Server) {
	signalChan := make(chan os.Signal, 1)
	signal.Notify(signalChan, os.Interrupt, os.Kill)

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
