package connection

import (
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/cloud-query/internal/log"
)

func (in *connection) Ping() error {
	klog.V(log.LogLevelDebug).Info("pinging database")
	return in.db.Ping()
}
