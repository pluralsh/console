package pool

import (
	"time"

	"github.com/pluralsh/console/go/cloud-query/internal/connection"
)

type entry struct {
	connection connection.Connection
	ping       time.Time
}

func (l *entry) alive(ttl time.Duration) bool {
	return l.ping.After(time.Now().Add(-ttl))
}
