package agent

import (
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/module/modagent"
)

var (
	_ modagent.Module = &module{}
)
