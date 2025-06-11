package steampipe

import "encoding/json"

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
		row := make([]any, len(cols))
		if err = rows.Scan(row); err != nil {
			return "", err
		}

		result = append(result, row)
	}

	r, err := json.Marshal(result)
	return string(r), err
}
