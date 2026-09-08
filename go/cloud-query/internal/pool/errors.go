package pool

import (
	"database/sql"
	"errors"
	"strings"

	"github.com/lib/pq"
)

const (
	pqInvalidAuthorization = "28000"
	pqInvalidPassword      = "28P01"
	pqAdminShutdown        = "57P01"
	pqCrashShutdown        = "57P02"
	pqCannotConnectNow     = "57P03"
)

// IsStaleConnection reports whether err means the pooled postgres session is
// gone and should be dropped rather than reused. Typical cases are a dropped
// per-connection role after TTL cleanup raced with reuse, or the postgres
// sidecar restarting and wiping ephemeral users.
func IsStaleConnection(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, sql.ErrConnDone) {
		return true
	}

	var pqErr *pq.Error
	if errors.As(err, &pqErr) {
		switch string(pqErr.Code) {
		case pqInvalidAuthorization, pqInvalidPassword, pqAdminShutdown, pqCrashShutdown, pqCannotConnectNow:
			return true
		}
		if len(pqErr.Code) >= 2 && pqErr.Code.Class() == "08" {
			return true
		}
	}

	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "role") && strings.Contains(msg, "does not exist")
}
