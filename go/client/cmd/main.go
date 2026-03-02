package main

import (
	"encoding/json"
	"os"

	"github.com/pluralsh/console/go/client"
)

func main() {
	queries := client.GeneratePersistedQueries()
	output := map[string]map[string]string{
		"operations": queries,
	}
	_ = json.NewEncoder(os.Stdout).Encode(output)
}
