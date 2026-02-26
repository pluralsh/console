package main

import (
	"github.com/pluralsh/kubernetes-agent/cmd"
	"github.com/pluralsh/kubernetes-agent/cmd/agentk/agentkapp"
)

func main() {
	cmd.Run(agentkapp.NewCommand())
}
