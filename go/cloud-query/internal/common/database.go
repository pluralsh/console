package common

import (
	"encoding/json"
	"fmt"
)

func formatValue(value any) any {
	switch v := value.(type) {
	case []byte:
		var result any
		if err := json.Unmarshal(v, &result); err == nil {
			return result
		}

		return string(v)
	default:
		return value
	}
}

func DataSource(host, port, db, user, password string) string {
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable", host, port, user, password, db)
}

func ToRow(columns []string, row []any) map[string]any {
	result := make(map[string]any, len(columns))
	for i, col := range columns {
		result[col] = formatValue(row[i])
	}

	return result
}

func ToRowJSON(columns []string, row []any) (string, error) {
	result := ToRow(columns, row)
	resultJSON, err := json.Marshal(result)
	if err != nil {
		return "", fmt.Errorf("failed to marshal row to JSON: %w", err)
	}

	return string(resultJSON), nil
}
