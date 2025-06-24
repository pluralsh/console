package connection

import (
	"database/sql"
)

func (in *connection) Exec(q string, args ...any) (sql.Result, error) {
	return in.db.Exec(q, args...)
}

func (in *connection) ExecAll(q map[string][]any) error {
	for query, args := range q {
		_, err := in.db.Exec(query, args...)
		if err != nil {
			return err
		}
	}

	return nil
}
