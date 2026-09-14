package connection

import (
	"context"
	"time"

	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/cloud-query/internal/log"
)

const pingTimeout = 5 * time.Second

func (in *connection) Ping() error {
	klog.V(log.LogLevelDebug).Info("pinging database")

	ctx, cancel := context.WithTimeout(context.Background(), pingTimeout)
	defer cancel()
	return in.db.PingContext(ctx)
}
