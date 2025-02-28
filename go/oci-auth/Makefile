ROOT_DIRECTORY := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))/../..

include $(ROOT_DIRECTORY)/go/paths.mk
include $(TOOLS_MAKEFILE)

# Setting SHELL to bash allows bash commands to be executed by recipes.
# Options are set to exit when a recipe line exits non-zero or a piped command fails.
SHELL = /usr/bin/env bash -o pipefail
.SHELLFLAGS = -ec

##@ General

.PHONY: help
help: ## show help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

.PHONY: show-dependency-updates
show-dependency-updates: ## show possible dependency updates
	go list -u -f '{{if (and (not (or .Main .Indirect)) .Update)}}{{.Path}} {{.Version}} -> {{.Update.Version}}{{end}}' -m all

.PHONY: update-dependencies
update-dependencies: ## update dependencies
	go get -u ./...
	go mod tidy

##@ Build

.PHONY: build
build: ## build binary
	go build -o bin/oci-auth .

.PHONY: run
run: ## run locally
	go run ./cmd/main.go

.PHONY: release
release: lint test ## builds release version of the app, requires GoReleaser to work
	goreleaser build --clean --single-target --snapshot

##@ Checks

.PHONY: lint
lint: TOOL = golangci-lint
lint: --tool ## run linters
	@$(GOLANGCI_LINT) run ./...

.PHONY: fix
fix: TOOL = golangci-lint
fix: --tool ## run linters and fix found issues
	@$(GOLANGCI_LINT) run --fix ./...

.PHONY: test
test: ## run tests
	go test ./...
