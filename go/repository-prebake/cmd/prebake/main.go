package main

import (
	"errors"
	"flag"
	"fmt"
	"os"

	prebake "github.com/pluralsh/console/go/repository-prebake"
)

func main() {
	if err := prebake.Main(os.Args[1:]); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			os.Exit(0)
		}
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}
