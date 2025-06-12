package steampipe

import (
	"database/sql"
	"fmt"

	"github.com/mattn/go-sqlite3"

	"github.com/pluralsh/console/go/cloud-query/cmd/args"
)

const (
	// extensionEntryPoint is the entry point function for the Steampipe SQLite extension.
	extensionEntryPoint = "sqlite3_extension_init"

	// driverName is the name of the Steampipe SQLite driver.
	driverName = "steampipe"
)

var (
	// extensionPaths are paths to the Steampipe SQLite extensions.
	extensionPaths = []string{extensionPath(ProviderAWS)}
)

func init() {
	sql.Register(driverName,
		&sqlite3.SQLiteDriver{
			ConnectHook: func(c *sqlite3.SQLiteConn) error {
				for _, path := range extensionPaths {
					fmt.Printf("loading Steampipe extension: %s\n", path)
					if err := c.LoadExtension(path, extensionEntryPoint); err != nil {
						return err
					}
				}

				return nil
			},
		},
	)
}

func extensionPath(provider Provider) string {
	switch provider {
	case ProviderAWS:
		return fmt.Sprintf("%s/steampipe_sqlite_%s.so", args.ExtensionsDir(), provider)
	default:
		return ""
	}
}
