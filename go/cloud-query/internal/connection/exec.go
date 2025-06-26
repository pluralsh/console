package connection

import (
	"database/sql"
)

func (in *connection) Exec(q string, args ...any) (sql.Result, error) {
	return in.db.Exec(q, args...)
}
