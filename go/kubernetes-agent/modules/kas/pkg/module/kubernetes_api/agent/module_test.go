package agent

import (
	"github.com/pluralsh/kubernetes-agent/pkg/module/modagent"
)

var (
	_ modagent.Module = &module{}
)
