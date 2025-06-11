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
	//pool, err := sqlitex.NewPool("file::memory:?mode=memory&cache=shared", sqlitex.PoolOptions{
	//	PoolSize: 50,
	//})
	//if err != nil {
	//	panic(err)
	//}
	//
	//conn, err := pool.Take(context.Background())
	//if err != nil {
	//	panic(err)
	//}
	//defer pool.Put(conn)
	//
	//err = sqlitex.Execute(conn, ".load ./bin/steampipe_sqlite_aws.so", nil)
	//if err != nil {
	//	panic(err)
	//}

	sql.Register("steampipe",
		&sqlite3.SQLiteDriver{
			ConnectHook: func(c *sqlite3.SQLiteConn) error {
				return c.LoadExtension("./bin/steampipe_sqlite_aws.so", "")
			},
		},
	)
	db, err := sql.Open("steampipe", ":memory:")
	if err != nil {
		panic(err)
	}
	err = db.Ping()
	if err != nil {
		panic(err)
	}

	//db, err := sql.Open("sqlite3", ":memory:")
	//if err != nil {
	//	panic(err)
	//}
	//
	//_, err = db.Exec("SELECT load_extension('./bin/steampipe_sqlite_aws.so');")
	//if err != nil {
	//	panic(err)
	//}
}
