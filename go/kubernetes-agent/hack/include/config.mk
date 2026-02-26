### Common application/container details
PROJECT_NAME := kas

### Dirs and paths
# Base paths
PARTIALS_DIR := $(ROOT_DIRECTORY)/hack/include
# Modules
MODULES_DIR := $(ROOT_DIRECTORY)/modules
API_DIR := $(MODULES_DIR)/api
KAS_DIR := $(MODULES_DIR)/kas
# Docker files
DOCKER_DIRECTORY := $(ROOT_DIRECTORY)/hack/docker
DOCKER_COMPOSE_PATH := $(DOCKER_DIRECTORY)/compose.yaml
DOCKER_COMPOSE_DEV_PATH := $(DOCKER_DIRECTORY)/compose.debug.yaml
# Build
TMP_DIR := $(ROOT_DIRECTORY)/.tmp
# Kind
KIND_CLUSTER_NAME := $(PROJECT_NAME)
KIND_CLUSTER_VERSION := 1.32.0
KIND_CLUSTER_IMAGE := docker.io/kindest/node:v${KIND_CLUSTER_VERSION}
KIND_CLUSTER_INTERNAL_KUBECONFIG_PATH := $(TMP_DIR)/kubeconfig
KIND_CLUSTER_KUBECONFIG_CONTEXT := kind-$(KIND_CLUSTER_NAME)
KIND_CONFIG_FILE := $(PARTIALS_DIR)/kind.config.yml
# Metrics server
METRICS_SERVER_VERSION := v0.7.0
# Ingress nginx
INGRESS_NGINX_VERSION := v1.14.1
# Redis
REDIS_VERSION := 7.2.2
# Tools
BINARIES_DIR := $(ROOT_DIRECTORY)/binaries
TOOLS_DIR := $(MODULES_DIR)/tools
TOOLS_MAKEFILE := $(TOOLS_DIR)/Makefile
GRAPHQL_MESH ?= $(BINARIES_DIR)/bin/graphql-mesh
GOLANGCI_LINT ?= $(BINARIES_DIR)/golangci-lint
GOLANGCI_LINT_CONFIG := $(ROOT_DIRECTORY)/.golangci.yml
GOTESTSUM := $(BINARIES_DIR)/gotestsum
MOCKGEN := $(BINARIES_DIR)/mockgen
NODE ?= $(BINARIES_DIR)/node
NPM ?= $(BINARIES_DIR)/npm
PROTOC ?= $(BINARIES_DIR)/protoc
PROTOC_GEN_DOC ?= $(BINARIES_DIR)/protoc-gen-doc
PROTOC_GEN_GO ?= $(BINARIES_DIR)/protoc-gen-go
PROTOC_GEN_GO_GRPC ?= $(BINARIES_DIR)/protoc-gen-go-grpc
PROTOC_GEN_VALIDATE ?= $(BINARIES_DIR)/protoc-gen-validate

# Global tool binaries
GO ?= $(shell which go)
KUBECTL ?= $(shell which kubectl)

### GOPATH check
ifndef GOPATH
$(warning $$GOPATH environment variable not set)
endif

ifeq (,$(findstring $(GOPATH)/bin,$(PATH)))
$(warning $$GOPATH/bin directory is not in your $$PATH)
endif
