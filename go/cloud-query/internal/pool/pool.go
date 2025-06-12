package pool

import (
	"context"
	"time"

	cmap "github.com/orcaman/concurrent-map/v2"
	"github.com/pluralsh/console/go/cloud-query/internal/config"
	"github.com/pluralsh/console/go/cloud-query/internal/connection"
)

type ConnectionPool struct {
	pool cmap.ConcurrentMap[string, entry]
	ttl  time.Duration
	ctx  context.Context
}

func NewConnectionPool(ctx context.Context, ttl time.Duration) *ConnectionPool {
	return &ConnectionPool{
		pool: cmap.New[entry](),
		ttl:  ttl,
		ctx:  ctx,
	}
}

func (c *ConnectionPool) Connect(config config.Configuration) (*connection.Connection, error) {
	sha, err := config.SHA()
	if err != nil {
		return nil, err
	}

	data, exists := c.pool.Get(sha)
	if !exists || !data.alive(c.ttl) {
		conn, err := connection.NewConnection(config)
		if err != nil {
			return nil, err
		}

		c.pool.Set(sha, entry{connection: conn, ping: time.Now()})
		return &conn, nil
	}

	return &data.connection, nil
}

func (c *ConnectionPool) Set(key string, value connection.Connection) {
	c.pool.Set(key, entry{connection: value, ping: time.Now()})
}

func (c *ConnectionPool) Remove(key string) {
	c.pool.Remove(key)
}

func (c *ConnectionPool) Wipe() {
	c.pool.Clear()
}
