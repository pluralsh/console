package steampipe

import (
	"database/sql"

	"github.com/mattn/go-sqlite3"
)

const (
	// TODO: refactor extensions to a table, in order to load all provider extensions at once.
	// extensionPath is the path to the Steampipe SQLite extension.
	extensionPath = "./bin/steampipe_sqlite_aws.so"

	// extensionEntryPoint is the entry point function for the Steampipe SQLite extension.
	extensionEntryPoint = "sqlite3_extension_init"

	// DriverName is the name of the Steampipe SQLite driver.
	DriverName = "steampipe"
)

func init() {
	sql.Register(DriverName,
		&sqlite3.SQLiteDriver{
			ConnectHook: func(c *sqlite3.SQLiteConn) error {
				return c.LoadExtension(extensionPath, extensionEntryPoint)
			},
		},
	)
}
