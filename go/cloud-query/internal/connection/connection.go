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

var defaultDataSource = common.DataSource(args.DatabaseHost(), args.DatabasePort(), args.DatabaseName(), args.DatabaseUser(), args.DatabasePassword())

type Connection interface {
	Configure() error
	Schema(table string) ([]cloudquery.SchemaResult, error)
	Tables(table string) ([]string, error)
	Query(q string, args ...any) (columns []string, rows [][]any, err error)
	Exec(q string, args ...any) (sql.Result, error)
	Ping() error
	LoadedModules() ([][]any, error)
	Close() error
}

type connection struct {
	name   string
	config *config.Configuration
	db     *sql.DB
}

func (in *connection) Configure() error {
	q, err := in.config.Query(in.name)
	if err != nil {
		return fmt.Errorf("failed to get config query for provider %s: %w", in.provider(), err)
	}

	_, err = in.db.Exec(q)
	if err != nil {
		return fmt.Errorf("failed to configure provider %s: %w", in.provider(), err)
	}

	klog.V(log.LogLevelDebug).InfoS("configured provider", "provider", in.provider(), "query", q)
	return nil
}

func (in *connection) Close() error {
	if err := in.config.Cleanup(in.name); err != nil {
		return fmt.Errorf("failed to cleanup configuration for provider %s: %w", in.provider(), err)
	}

	return in.db.Close()
}

func (in *connection) provider() config.Provider {
	return lo.Ternary(in.config == nil, config.ProviderUnknown, in.config.Provider())
}

func NewConnection(name, dataSource string, config *config.Configuration) (Connection, error) {
	db, err := sql.Open(driverName, lo.Ternary(lo.IsEmpty(dataSource), defaultDataSource, dataSource))
	if err != nil {
		return nil, err
	}

	return &connection{name: name, db: db, config: config}, nil
}
