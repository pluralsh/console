package server

import (
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/module/modserver"
)

var (
	_ modserver.Module        = &module{}
	_ modserver.Module        = &nopModule{}
	_ modserver.Factory       = &Factory{}
	_ modserver.ApplyDefaults = ApplyDefaults
)
