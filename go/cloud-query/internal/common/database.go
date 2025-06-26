package common

import (
	"fmt"
)

func DataSource(port uint32, user, password string) string {
	return fmt.Sprintf("host=localhost port=%d user=%s password=%s dbname=postgres sslmode=disable", port, user, password)
}
