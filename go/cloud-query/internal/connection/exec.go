package connection

import (
	"database/sql"
)

func (in *connection) Exec(q string, args ...any) (sql.Result, error) {
	if in.readOnly {
		return nil, ErrReadOnlyConnection
	}

	return in.db.Exec(q, args...)
}
