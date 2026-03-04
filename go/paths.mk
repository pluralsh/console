# Paths
DATASTORE_CHART_DIR := $(ROOT_DIRECTORY)/charts/datastore
CONTROLLER_CHART_DIR := $(ROOT_DIRECTORY)/charts/controller
CONSOLE_RAPID_CHART_DIR := $(ROOT_DIRECTORY)/charts/console-rapid
CONSOLE_CHART_DIR := $(ROOT_DIRECTORY)/charts/console
PLURAL_CONSOLE_CHART_DIR := $(ROOT_DIRECTORY)/plural/helm/console
WORKSPACES_DIR := $(ROOT_DIRECTORY)/go
TOOLS_DIR := $(WORKSPACES_DIR)/tools
TOOLS_MAKEFILE := $(TOOLS_DIR)/Makefile
BOILERPLATE_FILE := $(TOOLS_DIR)/boilerplate.go.txt
CLIENT_DIR := $(WORKSPACES_DIR)/client
CONTROLLER_DIR := $(WORKSPACES_DIR)/controller
CLOUD_QUERY_DIR := $(WORKSPACES_DIR)/cloud-query
KUBERNETES_AGENT_DIR := $(WORKSPACES_DIR)/kubernetes-agent
BINARIES_DIR := $(ROOT_DIRECTORY)/binaries
GOLANGCI_LINT_CONFIG := $(WORKSPACES_DIR)/.golangci.yml

# Tool binaries
CONTROLLER_GEN ?= $(BINARIES_DIR)/controller-gen
CRDDOCS ?= $(BINARIES_DIR)/crd-ref-docs
ENVSUBST ?= $(BINARIES_DIR)/envsubst
ENVTEST ?= $(BINARIES_DIR)/setup-envtest
GOIMPORTS ?= $(BINARIES_DIR)/goimports
GOLANGCI_LINT ?= $(BINARIES_DIR)/golangci-lint
GRAPHQL_MESH ?= $(BINARIES_DIR)/bin/graphql-mesh
GQLGEN ?= $(BINARIES_DIR)/gqlgen
GQLGENC ?= $(BINARIES_DIR)/gqlgenc
GOTESTSUM ?= $(BINARIES_DIR)/gotestsum
HELMIFY := $(BINARIES_DIR)/helmify
KUBEBUILDER ?= $(BINARIES_DIR)/kubebuilder
KUSTOMIZE ?= $(BINARIES_DIR)/kustomize
MOCKGEN ?= $(BINARIES_DIR)/mockgen
MOCKERY ?= $(BINARIES_DIR)/mockery
GINKGO ?= $(BINARIES_DIR)/ginkgo
PROTOC ?= $(BINARIES_DIR)/protoc
PROTOC_GEN_DOC ?= $(BINARIES_DIR)/protoc-gen-doc
PROTOC_GEN_GO ?= $(BINARIES_DIR)/protoc-gen-go
PROTOC_GEN_GO_GRPC ?= $(BINARIES_DIR)/protoc-gen-go-grpc
PROTOC_GEN_VALIDATE ?= $(BINARIES_DIR)/protoc-gen-validate
NODE ?= $(BINARIES_DIR)/node
NPM ?= $(BINARIES_DIR)/npm

# Global tool binaries
HELM ?= $(shell which helm)
GO ?= $(shell which go)
KUBECTL ?= $(shell which kubectl)