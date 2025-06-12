package main

import (
	_ "github.com/mattn/go-sqlite3"
	"github.com/pluralsh/console/go/cloud-query/internal/config"
	"github.com/pluralsh/console/go/cloud-query/internal/connection"
	"k8s.io/klog/v2"
)

func main() {
	pipe, err := connection.NewConnection(config.NewAWSConfiguration())
	if err != nil {
		klog.Fatalf("failed to create Connection instance: %v", err)
	}
	defer pipe.Close()

	modules, err := pipe.LoadedModules()
	if err != nil {
		klog.Fatalf("failed to load modules: %v", err)
	}
	klog.InfoS("loaded modules", "count", len(modules))

	result, err := pipe.Query("select vpc_id, cidr_block, state from aws_vpc")
	if err != nil {
		klog.Fatalf("failed to query: %v", err)
	}
	klog.InfoS("query result", "result", result)
}
