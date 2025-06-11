package steampipe

import (
	"database/sql"
)

const (
	// dataSourceName is the name of the SQLite database source.
	// In this case, we use an in-memory database as it is better for
	// steampipe lightweight usage.
	dataSourceName = ":memory:"
)

type Steampipe interface {
	LoadedModules() ([]string, error)
	Close() error
}

type steampipe struct {
	db *sql.DB
}

func (in *steampipe) Close() error {
	return in.db.Close()
}

func (in *steampipe) init() (Steampipe, error) {
	db, err := sql.Open(driverName, dataSourceName)
	if err != nil {
		return in, err
	}

	in.db = db
	return in, nil
}

// TODO: use singletone!
func NewSteampipe() (Steampipe, error) {
	// This function would typically initialize a new Steampipe instance.
	// For now, we return nil and nil to satisfy the interface.
	return (&steampipe{}).init()
}
