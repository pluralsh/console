//go:build tools

package deployment_operator_main

import (
	_ "github.com/elastic/crd-ref-docs"
	_ "github.com/golangci/golangci-lint/v2/cmd/golangci-lint"
	_ "github.com/vektra/mockery/v2"
	_ "gotest.tools/gotestsum"
	_ "k8s.io/client-go/discovery"
	_ "sigs.k8s.io/controller-runtime/tools/setup-envtest"
	_ "sigs.k8s.io/controller-tools/cmd/controller-gen"
)
