package store

import (
	"github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	"k8s.io/klog/v2"
	"zombiezen.com/go/sqlite"
	"zombiezen.com/go/sqlite/sqlitex"
)

// NodeStatisticHealth returns health status based on the number of pending pods.
func NodeStatisticHealth(pendingPods int64) *client.NodeStatisticHealth {
	switch {
	case pendingPods == 0:
		return lo.ToPtr(client.NodeStatisticHealthHealthy)
	case pendingPods <= 3:
		return lo.ToPtr(client.NodeStatisticHealthWarning)
	default:
		return lo.ToPtr(client.NodeStatisticHealthFailed)
	}
}

func WithTransaction(conn *sqlite.Conn, fn func() error) (err error) {
	if err = sqlitex.Execute(conn, "BEGIN IMMEDIATE", nil); err != nil {
		return err
	}

	defer func() {
		if p := recover(); p != nil {
			if e := sqlitex.Execute(conn, "ROLLBACK", nil); e != nil {
				klog.ErrorS(e, "failed to rollback transaction after panic")
			}
			panic(p)
		}

		if err != nil {
			if e := sqlitex.Execute(conn, "ROLLBACK", nil); e != nil {
				klog.ErrorS(e, "failed to rollback transaction")
			}
			return
		}

		if e := sqlitex.Execute(conn, "COMMIT", nil); e != nil {
			err = e
		}
	}()

	err = fn()
	return err
}

// withReadTransaction runs fn in a deferred transaction, so all its reads see one snapshot and no write lock is taken.
func withReadTransaction(conn *sqlite.Conn, fn func() error) (err error) {
	if err = sqlitex.Execute(conn, "BEGIN", nil); err != nil {
		return err
	}
	defer func() {
		if e := sqlitex.Execute(conn, "ROLLBACK", nil); e != nil && err == nil {
			err = e
		}
	}()

	return fn()
}
