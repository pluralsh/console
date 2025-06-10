package main

import (
	"flag"
	"fmt"
)

var (
	port = flag.Int("port", 50051, "the server port")
)

func main() {
	fmt.Println("Hello, World!")
}
