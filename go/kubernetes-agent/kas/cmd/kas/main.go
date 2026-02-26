package main

import (
	"github.com/pluralsh/kubernetes-agent/cmd"
	"github.com/pluralsh/kubernetes-agent/cmd/kas/kasapp"
)

func main() {
	cmd.Run(kasapp.NewCommand())
}
