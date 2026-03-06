package main

import (
	"github.com/pluralsh/console/go/kubernetes-agent/cmd"
	"github.com/pluralsh/console/go/kubernetes-agent/cmd/agentk/agentkapp"
)

func main() {
	cmd.Run(agentkapp.NewCommand())
}
