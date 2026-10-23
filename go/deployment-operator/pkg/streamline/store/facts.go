package store

import "strconv"

// sqlNull is the SQL literal of a missing value.
const sqlNull = "NULL"

type integer interface{ ~int | ~int64 }

// nullablePtr returns nil for a missing value, so the column stays NULL, and dereferences a present one.
// The SQL driver does not follow pointers, and a replica count of zero is a known value that must not become NULL.
func nullablePtr[T any](v *T) any {
	if v == nil {
		return nil
	}
	return *v
}

// sqlPtr renders an optional integer as an SQL literal for statements built as strings, NULL when it is missing.
func sqlPtr[T integer](v *T) string {
	if v == nil {
		return sqlNull
	}
	return strconv.FormatInt(int64(*v), 10)
}
