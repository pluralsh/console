package steampipe

import (
	"database/sql"

	"github.com/mattn/go-sqlite3"
)

const (
	// extensionEntryPoint is the entry point function for the Steampipe SQLite extension.
	extensionEntryPoint = "sqlite3_extension_init"

	// driverName is the name of the Steampipe SQLite driver.
	driverName = "steampipe"
)

var (
	// extensionPaths are paths to the Steampipe SQLite extensions.
	extensionPaths = []string{"./bin/steampipe_sqlite_aws.so"}
)

func init() {
	sql.Register(driverName,
		&sqlite3.SQLiteDriver{
			ConnectHook: func(c *sqlite3.SQLiteConn) error {
				for _, path := range extensionPaths {
					if err := c.LoadExtension(path, extensionEntryPoint); err != nil {
						return err
					}
				}

				return nil
			},
		},
	)
}
