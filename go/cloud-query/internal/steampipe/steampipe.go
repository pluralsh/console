package steampipe

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

type Steampipe interface {
	Query(q string) (string, error)
	LoadedModules() ([]string, error)
	Close() error
}

type steampipe struct {
	db     *sql.DB
	config config.Configuration
}

func (in *steampipe) Close() error {
	return in.db.Close()
}

// TODO: Add cache.
func NewSteampipe(config config.Configuration) (Steampipe, error) {
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

	return &steampipe{db: db, config: config}, nil
}
