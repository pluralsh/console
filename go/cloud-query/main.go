package main

import (
	"database/sql"
	"flag"

	"github.com/mattn/go-sqlite3"
	_ "github.com/mattn/go-sqlite3"
)

var (
	port = flag.Int("port", 50051, "the server port")
)

func main() {
	sql.Register("steampipe",
		&sqlite3.SQLiteDriver{
			ConnectHook: func(c *sqlite3.SQLiteConn) error {
				return c.LoadExtension("./bin/steampipe_sqlite_aws.so", "sqlite3_extension_init")
			},
		},
	)
	db, err := sql.Open("steampipe", ":memory:")
	if err != nil {
		panic(err)
	}
	defer db.Close()
	db.SetMaxOpenConns(1)

	err = db.Ping()
	if err != nil {
		panic(err)
	}
}
