package main

import (
	"context"

	_ "github.com/mattn/go-sqlite3"
	"k8s.io/klog/v2"

	_ "github.com/pluralsh/console/go/cloud-query/cmd/args"
	"github.com/pluralsh/console/go/cloud-query/internal/server"
)

func main() {
	//p := pool.NewConnectionPool(args.ConnectionTTL())
	//
	//c, err := p.Connect(config.NewAWSConfiguration())
	//if err != nil {
	//	klog.Fatalf("failed to create Connection instance: %v", err)
	//}
	//defer c.Close()

	//modules, err := c.LoadedModules()
	//if err != nil {
	//	klog.Fatalf("failed to load modules: %v", err)
	//}
	//klog.InfoS("loaded modules", "count", len(modules))
	//
	//result, err := c.Query("select vpc_id, cidr_block, state from aws_vpc")
	//if err != nil {
	//	klog.Fatalf("failed to query: %v", err)
	//}
	//klog.InfoS("query result", "result", result)

	s, err := server.New(nil, server.NewCloudQueryServer())
	if err != nil {
		klog.Fatalf("failed to create server: %v", err)
	}

	if err := s.Start(context.Background()); err != nil {
		klog.Fatalf("failed to start server: %v", err)
	}
}
