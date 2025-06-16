package connection

import (
	"database/sql"
	"fmt"

	"github.com/pluralsh/console/go/cloud-query/cmd/args"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/cloud-query/internal/config"
	"github.com/pluralsh/console/go/cloud-query/internal/log"
)

const driverName = "postgres"

var dataSourceName = fmt.Sprintf("host=localhost port=%d user=postgres dbname=postgres sslmode=disable", args.DatabasePort())

type Connection interface {
	Query(q string) (columns []string, rows [][]any, err error)
	Exec(q string) (sql.Result, error)
	Ping() error
	LoadedModules() ([][]any, error)
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

func (in *connection) Exec(q string) (sql.Result, error) {
	return in.db.Exec(q)
}
