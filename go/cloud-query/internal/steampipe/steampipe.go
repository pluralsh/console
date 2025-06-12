package steampipe

import (
	"database/sql"
	"fmt"
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
	db          *sql.DB
	credentials Credentials
}

func (in *steampipe) Close() error {
	return in.db.Close()
}

func (in *steampipe) init() (Steampipe, error) {
	db, err := sql.Open(driverName, dataSourceName)
	if err != nil {
		return in, err
	}

	authQuery, err := in.credentials.AuthQuery()
	if err != nil {
		return in, fmt.Errorf("failed to get auth query for provider %s: %w", in.credentials.Provider(), err)
	}

	rows, err := db.Query(authQuery)
	if err != nil {
		return in, fmt.Errorf("failed to configure provider %s: %w", in.credentials.Provider(), err)
	}
	defer rows.Close()

	in.db = db
	return in, nil
}

// TODO: Add cache.
func NewSteampipe(credentials Credentials) (Steampipe, error) {
	return (&steampipe{credentials: credentials}).init()
}
