package pool

import (
	"time"

	cmap "github.com/orcaman/concurrent-map/v2"

	"github.com/pluralsh/console/go/cloud-query/internal/config"
	"github.com/pluralsh/console/go/cloud-query/internal/connection"
)

type ConnectionPool struct {
	pool cmap.ConcurrentMap[string, entry]
	ttl  time.Duration
}

func NewConnectionPool(ttl time.Duration) *ConnectionPool {
	pool := &ConnectionPool{
		pool: cmap.New[entry](),
		ttl:  ttl,
	}

	go pool.cleanupRoutine()

	return pool
}

func (c *ConnectionPool) cleanupRoutine() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		for item := range c.pool.IterBuffered() {
			if !item.Val.alive(c.ttl) {
				_ = item.Val.connection.Close()
				c.pool.Remove(item.Key)
			}
		}
	}
}

func (c *ConnectionPool) Connect(config config.Configuration) (connection.Connection, error) {
	sha, err := config.SHA()
	if err != nil {
		return nil, err
	}

	data, exists := c.pool.Get(sha)
	if !exists || !data.alive(c.ttl) {
		conn, err := connection.NewConnection(sha, config)
		if err != nil {
			return nil, err
		}

		c.pool.Set(sha, entry{connection: conn, ping: time.Now()})
		return conn, nil
	}

	c.pool.Set(sha, entry{connection: data.connection, ping: time.Now()})
	return data.connection, nil
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
