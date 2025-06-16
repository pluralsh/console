package main

import (
	"database/sql"
	"fmt"
	"os"
	"strings"

	"github.com/fergusstrange/embedded-postgres"
	_ "github.com/mattn/go-sqlite3"
	_ "github.com/pluralsh/console/go/cloud-query/internal/connection"
)

const (
	binariesPath   = "/Users/marcin/Workspace/console/go/cloud-query/bin/"
	dbPath         = "/Users/marcin/Workspace/console/go/cloud-query/bin/pg"
	libPath        = "/Users/marcin/Workspace/console/go/cloud-query/bin/pg/lib/postgresql/"
	extensionsPath = "/Users/marcin/Workspace/console/go/cloud-query/bin/pg/share/postgresql/extension/"
)

func CopyFile(src, dest string) error {
	bytesRead, err := os.ReadFile(src)
	if err != nil {
		return err
	}

	return os.WriteFile(dest, bytesRead, 0777)
}

func main() {
	//p := pool.NewConnectionPool(args.ConnectionTTL())
	//s, err := server.New(nil, server.NewCloudQueryServer(p))
	//if err != nil {
	//	klog.Fatalf("failed to create server: %v", err)
	//}
	//
	//if err = s.Start(context.Background()); err != nil {
	//	klog.Fatalf("failed to start server: %v", err)
	//}

	postgres := embeddedpostgres.NewDatabase(
		embeddedpostgres.DefaultConfig().
			Port(5432).
			BinariesPath(dbPath).
			RuntimePath(dbPath).
			Version(embeddedpostgres.V15).
			StartParameters(map[string]string{"max_connections": "200"}))
	err := postgres.Start()
	if err != nil {
		panic(err)
	}

	//copy extensions
	err = CopyFile(binariesPath+"steampipe_postgres_aws.so", libPath+"steampipe_postgres_aws.so")
	if err != nil {
		panic(err)
	}
	err = CopyFile(binariesPath+"steampipe_postgres_aws.control", extensionsPath+"steampipe_postgres_aws.control")
	if err != nil {
		panic(err)
	}
	err = CopyFile(binariesPath+"steampipe_postgres_aws--1.0.sql", extensionsPath+"steampipe_postgres_aws--1.0.sql")
	if err != nil {
		panic(err)
	}

	db, err := sql.Open("postgres", "user=postgres password=postgres host=localhost port=5432 dbname=postgres sslmode=disable")
	if err != nil {
		return
	}
	defer db.Close()

	q, err := db.Exec("DROP EXTENSION IF EXISTS steampipe_postgres_aws CASCADE; CREATE EXTENSION IF NOT EXISTS steampipe_postgres_aws;")
	if err != nil {
		panic(err)
	}
	fmt.Println(q)

	query, err := db.Query("SELECT * FROM pg_extension;")
	if err != nil {
		return
	}
	defer query.Close()

	columns, err := query.Columns()
	if err != nil {
		return
	}
	fmt.Println("Columns:", strings.Join(columns, ", "))

	for query.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range columns {
			valuePtrs[i] = &values[i]
		}

		err = query.Scan(valuePtrs...)
		if err != nil {
			return
		}

		for i, value := range values {
			if value != nil {
				fmt.Printf("%s: %s\n", columns[i], value)
			}
		}
		fmt.Println("---")
	}

	err = postgres.Stop()
	if err != nil {
		panic(err)
	}
}
