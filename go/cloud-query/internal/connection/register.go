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
)

func registerDriver(driverName string, provider config.Provider) {
	sql.Register(driverName,
		&sqlite3.SQLiteDriver{
			ConnectHook: func(c *sqlite3.SQLiteConn) error {
				if err := c.SetTrace(&sqlite3.TraceConfig{
					Callback:        trace,
					EventMask:       sqlite3.TraceStmt,
					WantExpandedSQL: false,
				}); err != nil {
					return fmt.Errorf("could not set driver trace: %v", err)
				}

				path := fmt.Sprintf("%s/steampipe_sqlite_%s.so", args.ExtensionsDir(), provider)
				if err := c.LoadExtension(path, extensionEntryPoint); err != nil {
					return fmt.Errorf("could not load extension for the provider %s: %v", provider, err)
				}

				klog.V(log.LogLevelDebug).InfoS("loaded extension", "path", path)
				return nil
			},
		},
	)
}

func trace(info sqlite3.TraceInfo) int {
	klog.V(log.LogLevelDebug).InfoS("SQLite trace", "info", info)

	// Return 0 to continue processing
	return 0
}
