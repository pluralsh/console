package main

import (
	"github.com/pluralsh/console/go/kubernetes-agent/cmd"
	"github.com/pluralsh/console/go/kubernetes-agent/cmd/kas/kasapp"
)

func main() {
	cmd.Run(kasapp.NewCommand())
}
