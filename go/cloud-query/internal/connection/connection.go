package connection

import (
	"database/sql"
	"fmt"

	"github.com/samber/lo"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/cloud-query/cmd/args"
	"github.com/pluralsh/console/go/cloud-query/internal/common"
	"github.com/pluralsh/console/go/cloud-query/internal/config"
	"github.com/pluralsh/console/go/cloud-query/internal/log"
	"github.com/pluralsh/console/go/cloud-query/internal/proto/cloudquery"
)

const driverName = "postgres"

var defaultDataSource = common.DataSource(args.DatabasePort(), args.DatabaseUser(), args.DatabasePassword())

type Connection interface {
	Configure(config config.Configuration) error
	Schema(table string) ([]cloudquery.SchemaResult, error)
	Query(q string, args ...any) (columns []string, rows [][]any, err error)
	Exec(q string, args ...any) (sql.Result, error)
	Ping() error
	LoadedModules() ([][]any, error)
	Close() error
}

type connection struct {
	name     string
	provider config.Provider
	db       *sql.DB
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

	in.provider = config.Provider()
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

	return &connection{name: name, db: db}, nil
}
