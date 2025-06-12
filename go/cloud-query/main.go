package main

import (
	"flag"
	"log"

	_ "github.com/mattn/go-sqlite3"

	"github.com/pluralsh/console/go/cloud-query/internal/steampipe"
)

var (
	port = flag.Int("port", 50051, "the server port")
)

func main() {
	pipe, err := steampipe.NewSteampipe(steampipe.NewAWSCredentials(nil, nil))
	if err != nil {
		log.Fatalf("failed to create Steampipe instance: %v", err)
	}
	defer pipe.Close()

	//modules, err := pipe.LoadedModules()
	//if err != nil {
	//	log.Fatalf("failed to load modules: %v", err)
	//}
	//log.Printf("loaded modules: %v", modules)

	result, err := pipe.Query("select vpc_id, cidr_block, state from aws_vpc")
	if err != nil {
		log.Fatalf("failed to load modules: %v", err)
	}
	log.Println(result)
}
