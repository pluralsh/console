package connection

import (
	"database/sql"
	"fmt"

	"github.com/pluralsh/console/go/cloud-query/internal/common"
	"github.com/samber/lo"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/cloud-query/cmd/args"

	"github.com/pluralsh/console/go/cloud-query/internal/config"
	"github.com/pluralsh/console/go/cloud-query/internal/log"
)

const driverName = "postgres"

var defaultDataSource = common.DataSource(args.DatabasePort(), "postgres", "postgres") // TODO: Change password.

type Connection interface {
	Configure(config config.Configuration) error
	Query(q string) (columns []string, rows [][]any, err error)
	Exec(q string) (sql.Result, error)
	Ping() error
	LoadedModules() ([][]any, error)
	Close() error
}

type connection struct {
	name string
	db   *sql.DB
}

func (in *connection) Configure(config config.Configuration) error {
	q, err := config.Query(in.name)
	if err != nil {
		return fmt.Errorf("failed to get config query for provider %s: %w", config.Provider(), err)
	}

	_, err = in.db.Exec(q)
	if err != nil {
		return fmt.Errorf("failed to configure provider %s: %w", config.Provider(), err)
	}

	klog.V(log.LogLevelDebug).InfoS("configured provider", "provider", config.Provider())
	return nil
}

func (in *connection) Close() error {
	return in.db.Close()
}

func NewConnection(name, dataSource string) (Connection, error) {
	db, err := sql.Open(driverName, lo.Ternary(lo.IsEmpty(dataSource), defaultDataSource, dataSource))
	if err != nil {
		return nil, err
	}

	return &connection{name, db}, nil
}
