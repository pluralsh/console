package pool

import (
	"fmt"
	"time"

	"github.com/gofrs/uuid"
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
	_, err := c.admin.Exec(`
		-- Create the schema
		DROP SCHEMA IF EXISTS "$2" CASCADE;
		CREATE SCHEMA "$2";
		COMMENT ON SCHEMA "$2" IS 'steampipe aws fdw';
		CREATE EXTENSION IF NOT EXISTS ltree SCHEMA "$2";
		
		-- Create the user
		CREATE USER "$2" WITH PASSWORD '$2';
		ALTER USER "$2" WITH NOSUPERUSER;
		ALTER USER "$2" SET SEARCH_PATH = "$2";
		
		-- Allow connecting to the database
		REVOKE CONNECT ON DATABASE "$1" FROM PUBLIC;
		GRANT  CONNECT ON DATABASE "$1" TO "$2";
		
		-- Allow using the schema
		REVOKE ALL ON SCHEMA "$2" FROM PUBLIC;
		GRANT  ALL ON SCHEMA "$2" TO "$2";
		
		-- Allow accessing tables
		REVOKE ALL ON ALL TABLES IN SCHEMA "$2" FROM PUBLIC;
		GRANT  ALL ON ALL TABLES IN SCHEMA "$2" TO "$2";
		
		-- Grant usage on foreign data wrapper and servers
		GRANT USAGE ON FOREIGN DATA WRAPPER steampipe_postgres_$3 TO "$2";`, args.DatabaseName(), connection, provider)
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

		conn, err := connection.NewConnection(connectionName, common.DataSource(args.DatabasePort(), connectionName, connectionName))
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
