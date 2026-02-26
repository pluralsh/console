package server

import (
	"github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
)

var (
	_ modserver.Module  = &module{}
	_ modserver.Factory = &Factory{}
)
