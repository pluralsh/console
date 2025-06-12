package main

import (
	_ "github.com/mattn/go-sqlite3"
	"github.com/pluralsh/console/go/cloud-query/cmd/args"
	"github.com/pluralsh/console/go/cloud-query/internal/config"
	"github.com/pluralsh/console/go/cloud-query/internal/pool"
	"k8s.io/klog/v2"
)

func main() {
	p := pool.NewConnectionPool(args.ConnectionTTL())

	c, err := p.Connect(config.NewAWSConfiguration())
	if err != nil {
		klog.Fatalf("failed to create Connection instance: %v", err)
	}
	defer c.Close()

	modules, err := c.LoadedModules()
	if err != nil {
		klog.Fatalf("failed to load modules: %v", err)
	}
	klog.InfoS("loaded modules", "count", len(modules))

	result, err := c.Query("select vpc_id, cidr_block, state from aws_vpc")
	if err != nil {
		klog.Fatalf("failed to query: %v", err)
	}
	klog.InfoS("query result", "result", result)
}
