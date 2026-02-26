### Application details
PROJECT_NAME := kas

# Directories
API_DIR := $(KUBERNETES_AGENT_DIR)/api
KAS_DIR := $(KUBERNETES_AGENT_DIR)/kas
TMP_DIR := $(KUBERNETES_AGENT_DIR)/.tmp

# Docker files
DOCKER_DIRECTORY := $(KUBERNETES_AGENT_DIR)/hack/docker
DOCKER_COMPOSE_PATH := $(DOCKER_DIRECTORY)/compose.yaml
DOCKER_COMPOSE_DEV_PATH := $(DOCKER_DIRECTORY)/compose.debug.yaml

# Local testing setup
INGRESS_NGINX_VERSION := v1.14.1
REDIS_VERSION := 7.2.2
KIND_CLUSTER_NAME := $(PROJECT_NAME)
KIND_CLUSTER_VERSION := 1.32.0
KIND_CLUSTER_IMAGE := docker.io/kindest/node:v${KIND_CLUSTER_VERSION}
KIND_CLUSTER_INTERNAL_KUBECONFIG_PATH := $(TMP_DIR)/kubeconfig
KIND_CLUSTER_KUBECONFIG_CONTEXT := kind-$(KIND_CLUSTER_NAME)
KIND_CONFIG_FILE := $(KUBERNETES_AGENT_DIR)/kind.config.yml

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
