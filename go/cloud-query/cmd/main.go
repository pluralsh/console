package main

import (
	"context"

	_ "github.com/mattn/go-sqlite3"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/cloud-query/cmd/args"
	_ "github.com/pluralsh/console/go/cloud-query/cmd/args"
	_ "github.com/pluralsh/console/go/cloud-query/internal/connection"
	"github.com/pluralsh/console/go/cloud-query/internal/pool"
	"github.com/pluralsh/console/go/cloud-query/internal/server"
)

func main() {
	p := pool.NewConnectionPool(args.ConnectionTTL())
	s, err := server.New(nil, server.NewCloudQueryServer(p))
	if err != nil {
		klog.Fatalf("failed to create server: %v", err)
	}

	if err = s.Start(context.Background()); err != nil {
		klog.Fatalf("failed to start server: %v", err)
	}
}
