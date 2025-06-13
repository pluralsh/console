package connection

import (
	"database/sql"
	"fmt"

	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/cloud-query/internal/config"
	"github.com/pluralsh/console/go/cloud-query/internal/log"
)

const (
	// dataSourceName is the name of the SQLite database source.
	// In this case, we use an in-memory database as it is better for
	// steampipe lightweight usage.
	dataSourceName = ":memory:"
)

type Connection interface {
	Query(q string) (string, error)
	Ping() error
	LoadedModules() ([]string, error)
	Close() error
}

type connection struct {
	db     *sql.DB
	config config.Configuration
}

func (in *connection) Close() error {
	return in.db.Close()
}

func NewConnection(config config.Configuration) (Connection, error) {
	db, err := sql.Open(driverName, dataSourceName)
	if err != nil {
		return nil, err
	}

	q, err := config.Query()
	if err != nil {
		return nil, fmt.Errorf("failed to get config query for provider %s: %w", config.Provider(), err)
	}

	_, err = db.Exec(q)
	if err != nil {
		return nil, fmt.Errorf("failed to configure provider %s: %w", config.Provider(), err)
	}
	klog.V(log.LogLevelDebug).InfoS("configured provider", "provider", config.Provider())

	return &connection{db: db, config: config}, nil
}
