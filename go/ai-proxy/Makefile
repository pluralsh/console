ROOT_DIRECTORY := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))/../..

include $(ROOT_DIRECTORY)/go/paths.mk
include $(WORKSPACES_DIR)/common.mk
include $(TOOLS_MAKEFILE)

DIST_DIR := dist
BINARY_NAME := ai-proxy

# Image URL to use all building/pushing image targets
IMG_NAME ?= ai-proxy
IMG_TAG ?= master

DEFAULT_PROVIDER := openai
PROVIDER := $(if $(PLURAL_AIPROXY_PROVIDER),$(PLURAL_AIPROXY_PROVIDER),$(DEFAULT_PROVIDER))

# Defaults to locally hosted LM Studio server
DEFAULT_PROVIDER_API_HOST := http://127.0.0.1:1234
PROVIDER_API_HOST := $(if $(PLURAL_AIPROXY_PROVIDER_API_HOST),$(PLURAL_AIPROXY_PROVIDER_API_HOST),$(DEFAULT_PROVIDER_API_HOST))

DEFAULT_PROVIDER_TOKEN := "useEnvVarInstead"
PROVIDER_TOKEN := $(if $(PLURAL_AIPROXY_PROVIDER_TOKEN),$(PLURAL_AIPROXY_PROVIDER_TOKEN),$(DEFAULT_PROVIDER_TOKEN))


.PHONY: build
build: ## build manager binary
	go build -o ${DIST_DIR}/${BINARY_NAME} .

.PHONY: run
run: ## run a proxy locally
	go run ./ \
		--provider=${PROVIDER} \
		--provider-host=${PROVIDER_API_HOST} \
		--provider-tokens=${PROVIDER_TOKEN} \
		--v=4

.PHONY: docker ## build docker image
docker:
	docker build \
		--build-arg VERSION="0.0.0-prod" \
		--build-arg GIT_COMMIT="make-build" \
		--no-cache \
		-t ${IMG_NAME}:${IMG_TAG} \
		-f Dockerfile \
		.

.PHONY: test
test: ## run tests
	go test ./test/... -v -count=1
