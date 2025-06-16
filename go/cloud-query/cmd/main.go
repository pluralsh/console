package main

import (
	"github.com/fergusstrange/embedded-postgres"
	"github.com/pluralsh/console/go/cloud-query/cmd/args"
	_ "github.com/pluralsh/console/go/cloud-query/internal/connection"
	"k8s.io/klog/v2"
)

func main() {
	db := embeddedpostgres.NewDatabase(
		embeddedpostgres.DefaultConfig().
			Port(args.DatabasePort()).
			BinariesPath(args.DatabaseDir()).
			RuntimePath(args.DatabaseDir()).
			Version(args.DatabaseVersion()).
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

	//p := pool.NewConnectionPool(args.ConnectionTTL())
	//s, err := server.New(nil, server.NewCloudQueryServer(p))
	//if err != nil {
	//	klog.Fatalf("failed to create server: %v", err)
	//}
	//
	//if err = s.Start(context.Background()); err != nil {
	//	klog.Fatalf("failed to start server: %v", err)
	//}
}
