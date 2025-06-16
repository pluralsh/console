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

func (c *ConnectionPool) setup(name, password string) error {
	// TODO: refactor and maybe only grant user the privileges they need
	_, err := c.admin.Exec(fmt.Sprintf(`
		CREATE USER "%s" WITH PASSWORD '%s';
		GRANT ALL PRIVILEGES ON DATABASE postgres TO "%s";
		ALTER USER "%s" WITH SUPERUSER;
	`, name, password, name, name))
	return err
}

func (c *ConnectionPool) cleanup(name string) error {
	// TODO: cleanup connection in the db
	_, err := c.admin.Exec(fmt.Sprintf("DROP USER IF EXISTS %q", name))
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
		if err = c.setup(connectionName, connectionName); err != nil {
			return nil, fmt.Errorf("failed to create user %s: %w", connectionName, err)
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
