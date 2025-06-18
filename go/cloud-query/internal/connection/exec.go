package connection

import (
	"database/sql"
)

func (in *connection) Exec(q string) (sql.Result, error) {
	return in.db.Exec(q)
}
