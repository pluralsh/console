//go:build tools

package tools

import (
	_ "github.com/99designs/gqlgen"
	_ "github.com/Yamashou/gqlgenc"
	_ "github.com/a8m/envsubst/cmd/envsubst"
	_ "github.com/arttor/helmify/cmd/helmify"
	_ "github.com/elastic/crd-ref-docs"
	_ "github.com/golangci/golangci-lint/v2/cmd/golangci-lint"
	_ "github.com/onsi/ginkgo/v2/ginkgo"
	_ "github.com/vektra/mockery/v2"
	_ "golang.org/x/tools/cmd/goimports"
	_ "google.golang.org/grpc/cmd/protoc-gen-go-grpc"
	_ "google.golang.org/protobuf/cmd/protoc-gen-go"
	_ "sigs.k8s.io/controller-runtime/tools/setup-envtest"
	_ "sigs.k8s.io/controller-tools/cmd/controller-gen"
	_ "sigs.k8s.io/kustomize/kustomize/v5"
)
