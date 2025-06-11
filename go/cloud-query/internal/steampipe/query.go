package steampipe

import (
	"encoding/json"
)

func (in *steampipe) Query(q string) (string, error) {
	rows, err := in.db.Query(q)
	if err != nil {
		return "", err
	}
	defer rows.Close()

	cols, err := rows.Columns()
	if err != nil {
		return "", err
	}

	result := make([][]any, 0)
	for rows.Next() {
		values := make([]any, len(cols))
		pointers := make([]any, len(cols))
		for i := range values {
			pointers[i] = &values[i]
		}

		if err = rows.Scan(pointers...); err != nil {
			return "", err
		}

		result = append(result, values)
	}

	r, err := json.Marshal(result)
	return string(r), err
}
