package pool

import (
	"fmt"
	"strings"
	"text/template"
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

func (c *ConnectionPool) setup(user, password, schema, provider string) error {
	tmpl, err := template.New("setup").Parse(`
		-- Create the schema
		DROP SCHEMA IF EXISTS "{{ .Schema }}" CASCADE;
		CREATE SCHEMA "{{ .Schema }}";
		COMMENT ON SCHEMA "{{ .Schema }}" IS 'steampipe aws fdw';
		CREATE EXTENSION IF NOT EXISTS ltree SCHEMA "{{ .Schema }}";
		
		-- Create the user
		CREATE USER "{{ .User }}" WITH PASSWORD '{{ .Password }}';
		ALTER USER "{{ .User }}" WITH NOSUPERUSER;
		ALTER USER "{{ .User }}" SET SEARCH_PATH = "{{ .Schema }}";
		
		-- Allow connecting to the database
		REVOKE CONNECT ON DATABASE "{{ .Database }}" FROM PUBLIC;
		GRANT  CONNECT ON DATABASE "{{ .Database }}" TO "{{ .User }}";
		
		-- Allow using the schema
		REVOKE ALL ON SCHEMA "{{ .Schema }}" FROM PUBLIC;
		GRANT  ALL ON SCHEMA "{{ .Schema }}" TO "{{ .User }}";
		
		-- Allow accessing tables
		REVOKE ALL ON ALL TABLES IN SCHEMA "{{ .Schema }}" FROM PUBLIC;
		GRANT  ALL ON ALL TABLES IN SCHEMA "{{ .Schema }}" TO "{{ .User }}";
		
		-- Grant usage on foreign data wrapper and servers
		GRANT USAGE ON FOREIGN DATA WRAPPER steampipe_postgres_{{ .Provider }} TO "{{ .User }}";
`)
	// failed to connect to provider 'aws': failed to configure provider aws: pq: type "ltree" does not exist
	if err != nil {
		return fmt.Errorf("error parsing template: %w", err)
	}

	out := new(strings.Builder)
	if err = tmpl.Execute(out, map[string]string{
		"User":     user,
		"Password": password,
		"Schema":   schema,
		"Database": "postgres",
		"Provider": provider,
	}); err != nil {
		return fmt.Errorf("error executing template: %w", err)
	}

	_, err = c.admin.Exec(out.String())
	return err
}

func (c *ConnectionPool) cleanup(user, schema, connection string) error {
	tmpl, err := template.New("setup").Parse(`
		-- Cleanup the connection
		DROP SERVER IF EXISTS steampipe_{{ .Connection }};

		-- Cleanup the schema
		DROP SCHEMA IF EXISTS "{{ .Schema }}" CASCADE;

		-- Cleanup the user
		DROP USER IF EXISTS "{{ .User }}";
`)
	if err != nil {
		return fmt.Errorf("error parsing template: %w", err)
	}

	out := new(strings.Builder)
	if err = tmpl.Execute(out, map[string]string{
		"User":       user,
		"Schema":     schema,
		"Connection": connection,
	}); err != nil {
		return fmt.Errorf("error executing template: %w", err)
	}

	_, err = c.admin.Exec(out.String())
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
		if err = c.setup(connectionName, connectionName, connectionName, string(config.Provider())); err != nil {
			return nil, fmt.Errorf("failed to create user %s: %w", connectionName, err)
		}

		conn, err := connection.NewConnection(connectionName, common.DataSource(args.DatabasePort(), connectionName, connectionName))
		if err != nil {
			return nil, err
		}

		if err := conn.Configure(config); err != nil {
			_ = c.cleanup(connectionName, connectionName, connectionName)
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
	_ = c.cleanup(t.Val.uuid, t.Val.uuid, t.Val.uuid)
	err := t.Val.connection.Close()
	if err != nil {
		klog.ErrorS(err, "failed to close connection", "connection", t.Val.uuid)
	}

	c.pool.Remove(t.Key)
}

func (c *ConnectionPool) Wipe() {
	c.pool.Clear()
}
