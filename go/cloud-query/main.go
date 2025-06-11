package main

import (
	"flag"
	"fmt"
	"log"

	_ "github.com/mattn/go-sqlite3"

	"github.com/pluralsh/console/go/cloud-query/internal/steampipe"
)

var (
	port = flag.Int("port", 50051, "the server port")
)

func main() {
	pipe, err := steampipe.NewSteampipe()
	if err != nil {
		log.Fatalf("failed to create Steampipe instance: %v", err)
	}
	defer pipe.Close()

	modules, err := pipe.LoadedModules()
	if err != nil {
		log.Fatalf("failed to load modules: %v", err)
	}
	fmt.Println(modules)

	select {}
}
