package connection

import (
	"database/sql"
	"fmt"

	"github.com/mattn/go-sqlite3"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/cloud-query/cmd/args"
	"github.com/pluralsh/console/go/cloud-query/internal/config"
	"github.com/pluralsh/console/go/cloud-query/internal/log"
)

const (
	// extensionEntryPoint is the entry point function for the Connection SQLite extension.
	extensionEntryPoint = "sqlite3_extension_init"

	// driverName is the name of the Connection SQLite driver.
	driverName = "connection"
)

var (
	// extensionPaths are paths to the Connection SQLite extensions.
	extensionPaths = []string{
		fmt.Sprintf("%s/steampipe_sqlite_%s.so", args.ExtensionsDir(), config.ProviderAWS),
		fmt.Sprintf("%s/steampipe_sqlite_%s.so", args.ExtensionsDir(), config.ProviderAzure),
		fmt.Sprintf("%s/steampipe_sqlite_%s.so", args.ExtensionsDir(), config.ProviderGCP),
	}
)

func init() {
	sql.Register(driverName,
		&sqlite3.SQLiteDriver{
			ConnectHook: func(c *sqlite3.SQLiteConn) error {
				for _, path := range extensionPaths {
					if err := c.LoadExtension(path, extensionEntryPoint); err != nil {
						return err
					}

					klog.V(log.LogLevelDebug).InfoS("loading extension", "path", path)
				}

				return nil
			},
		},
	)
}
