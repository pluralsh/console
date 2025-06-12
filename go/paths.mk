# Paths
DATASTORE_CHART_DIR := $(ROOT_DIRECTORY)/charts/datastore
CONTROLLER_CHART_DIR := $(ROOT_DIRECTORY)/charts/controller
PLURAL_CONSOLE_CHART_DIR := $(ROOT_DIRECTORY)/plural/helm/console
WORKSPACES_DIR := $(ROOT_DIRECTORY)/go
TOOLS_DIR := $(WORKSPACES_DIR)/tools
TOOLS_MAKEFILE := $(TOOLS_DIR)/Makefile
BOILERPLATE_FILE := $(TOOLS_DIR)/boilerplate.go.txt
CLIENT_DIR := $(WORKSPACES_DIR)/client
CONTROLLER_DIR := $(WORKSPACES_DIR)/controller
BINARIES_DIR := $(ROOT_DIRECTORY)/binaries

# Tool binaries
CONTROLLER_GEN ?= $(BINARIES_DIR)/controller-gen
CRDDOCS ?= $(BINARIES_DIR)/crd-ref-docs
ENVSUBST ?= $(BINARIES_DIR)/envsubst
ENVTEST ?= $(BINARIES_DIR)/setup-envtest
GOIMPORTS ?= $(BINARIES_DIR)/goimports
GOLANGCI_LINT ?= $(BINARIES_DIR)/golangci-lint
GQLGEN ?= $(BINARIES_DIR)/gqlgen
GQLGENC ?= $(BINARIES_DIR)/gqlgenc
HELMIFY := $(BINARIES_DIR)/helmify
KUBEBUILDER ?= $(BINARIES_DIR)/kubebuilder
KUSTOMIZE ?= $(BINARIES_DIR)/kustomize
MOCKERY ?= $(BINARIES_DIR)/mockery
GINKGO ?= $(BINARIES_DIR)/ginkgo
PROTOC ?= $(BINARIES_DIR)/protoc

# Global tool binaries
HELM ?= $(shell which helm)
GO ?= $(shell which go)
KUBECTL ?= $(shell which kubectl)