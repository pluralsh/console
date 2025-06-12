package connection

import (
	"database/sql"
	"fmt"

	"github.com/pluralsh/console/go/cloud-query/internal/config"
)

const (
	// dataSourceName is the name of the SQLite database source.
	// In this case, we use an in-memory database as it is better for
	// steampipe lightweight usage.
	dataSourceName = ":memory:"
)

type Connection interface {
	Query(q string) (string, error)
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

	rows, err := db.Query(q)
	if err != nil {
		return nil, fmt.Errorf("failed to configure provider %s: %w", config.Provider(), err)
	}
	defer rows.Close()

	return &connection{db: db, config: config}, nil
}
