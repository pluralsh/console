ROOT_DIRECTORY := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))/../..

include $(ROOT_DIRECTORY)/go/paths.mk
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

.PHONY: help
help: ## show help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

.PHONY: build
build: fmt vet ## build manager binary
	go build -o ${DIST_DIR}/${BINARY_NAME} .

.PHONY: run
run: fmt vet ## run a proxy locally
	go run ./ \
		--provider=ollama \
		--provider-host=http://localhost:11434 \
		--provider-token=${PROVIDER_TOKEN} \
		--v=4

.PHONY: update-dependencies
update-dependencies: ## update dependencies
	go get -u ./...
	go mod tidy

.PHONY: docker ## build docker image
docker:
	docker build \
		--build-arg VERSION="0.0.0-prod" \
		--build-arg GIT_COMMIT="make-build" \
		--no-cache \
		-t ${IMG_NAME}:${IMG_TAG} \
		-f Dockerfile \
		.

##@ Tests / Lint

.PHONY: check
check: TOOL = goimports golangci-lint
check: --tool vet lint test ## run all code checks/tests

.PHONY: goimports
goimports: TOOL = goimports
goimports: --tool ## format code imports
	@$(GOIMPORTS) -w ./

.PHONY: fmt
fmt: goimports ## run go fmt
	@go fmt ./...

.PHONY: vet
vet: ## run go vet
	@go vet ./...

.PHONY: lint
lint: TOOL = golangci-lint
lint: --tool ## run linters
	@$(GOLANGCI_LINT) run ./...

.PHONY: fix
fix: TOOL = golangci-lint
fix: --tool fmt ## fix issues found by linters
	@$(GOLANGCI_LINT) run --fix ./...

.PHONY: test
test: fmt vet ## run tests
	go test ./test/... -v -count=1
