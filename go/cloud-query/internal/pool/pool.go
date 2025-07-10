package pool

import (
	"fmt"
	"time"

	"github.com/gofrs/uuid"
	"github.com/lib/pq"
	cmap "github.com/orcaman/concurrent-map/v2"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/cloud-query/cmd/args"
	"github.com/pluralsh/console/go/cloud-query/internal/common"

	"github.com/pluralsh/console/go/cloud-query/internal/config"
	"github.com/pluralsh/console/go/cloud-query/internal/connection"
)

type ConnectionPool struct {
	admin connection.Connection
	pool  cmap.ConcurrentMap[string, entry]
	ttl   time.Duration
}

func NewConnectionPool(ttl time.Duration) (*ConnectionPool, error) {
	admin, err := connection.NewConnection("admin", "")
	if err != nil {
		return nil, fmt.Errorf("failed to create admin connection: %w", err)
	}

	pool := &ConnectionPool{
		admin: admin,
		pool:  cmap.New[entry](),
		ttl:   ttl,
	}

	go pool.cleanupRoutine()

	return pool, nil
}

func (c *ConnectionPool) cleanupRoutine() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		for item := range c.pool.IterBuffered() {
			if !item.Val.alive(c.ttl) {
				_ = item.Val.connection.Close()
				c.Remove(item)
			}
		}
	}
}

func (c *ConnectionPool) setup(connection, provider string) error {
	query := fmt.Sprintf(`
		-- Create the schema
		DROP SCHEMA IF EXISTS %[1]s CASCADE;
		CREATE SCHEMA %[1]s;
		COMMENT ON SCHEMA %[1]s IS 'steampipe aws fdw';
		CREATE EXTENSION IF NOT EXISTS ltree SCHEMA %[1]s;

		-- Create the user
		CREATE USER %[1]s WITH PASSWORD %[2]s;
		ALTER USER %[1]s WITH NOSUPERUSER;
		ALTER USER %[1]s SET SEARCH_PATH = %[1]s;

		-- Allow connecting to the database
		REVOKE CONNECT ON DATABASE %[4]s FROM PUBLIC;
		GRANT  CONNECT ON DATABASE %[4]s TO %[1]s;

		-- Allow using the schema
		REVOKE ALL ON SCHEMA %[1]s FROM PUBLIC;
		GRANT  ALL ON SCHEMA %[1]s TO %[1]s;

		-- Allow accessing tables
		REVOKE ALL ON ALL TABLES IN SCHEMA %[1]s FROM PUBLIC;
		GRANT  ALL ON ALL TABLES IN SCHEMA %[1]s TO %[1]s;

		-- Grant usage on foreign data wrapper and servers
		GRANT USAGE ON FOREIGN DATA WRAPPER %[3]s TO %[1]s;
	`, pq.QuoteIdentifier(connection), pq.QuoteLiteral(connection), pq.QuoteIdentifier("steampipe_postgres_"+provider), pq.QuoteIdentifier(args.DatabaseName()))

	_, err := c.admin.Exec(query)
	return err
}

func (c *ConnectionPool) cleanup(connection string) error {
	_, err := c.admin.Exec(`
		-- Cleanup the connection
		DROP SERVER IF EXISTS steampipe_$1;

		-- Cleanup the schema
		DROP SCHEMA IF EXISTS "$1" CASCADE;

		-- Cleanup the user
		DROP USER IF EXISTS "$1";`, connection)
	return err
}

func (c *ConnectionPool) Connect(config config.Configuration) (connection.Connection, error) {
	sha, err := config.SHA()
	if err != nil {
		return nil, err
	}

	data, exists := c.pool.Get(sha)
	if exists && !data.alive(c.ttl) {
		c.Remove(cmap.Tuple[string, entry]{Key: sha, Val: data})
	}

	if !exists || !data.alive(c.ttl) {
		id, err := uuid.NewV6()
		if err != nil {
			return nil, err
		}

		connectionName := fmt.Sprintf("%x", id)
		if err = c.setup(connectionName, string(config.Provider())); err != nil {
			return nil, fmt.Errorf("setup failed: %w", err)
		}

		conn, err := connection.NewConnection(
			connectionName,
			common.DataSource(args.DatabaseHost(), args.DatabasePort(), args.DatabaseName(), connectionName, connectionName),
		)
		if err != nil {
			return nil, err
		}

		if err := conn.Configure(config); err != nil {
			_ = c.cleanup(connectionName)
			_ = conn.Close()
			return nil, err
		}

		c.pool.Set(sha, entry{connection: conn, ping: time.Now(), uuid: connectionName})
		return conn, nil
	}

	data.ping = time.Now()
	c.pool.Set(sha, data)
	return data.connection, nil
}

func (c *ConnectionPool) Set(key string, value connection.Connection) {
	c.pool.Set(key, entry{connection: value, ping: time.Now()})
}

func (c *ConnectionPool) Remove(t cmap.Tuple[string, entry]) {
	_ = c.cleanup(t.Val.uuid)
	err := t.Val.connection.Close()
	if err != nil {
		klog.ErrorS(err, "failed to close connection", "connection", t.Val.uuid)
	}

	c.pool.Remove(t.Key)
}

func (c *ConnectionPool) Wipe() {
	c.pool.Clear()
}
