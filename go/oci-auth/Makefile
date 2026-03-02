ROOT_DIRECTORY := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))/../..

include $(ROOT_DIRECTORY)/go/paths.mk
include $(WORKSPACES_DIR)/common.mk
include $(TOOLS_MAKEFILE)

# Setting SHELL to bash allows bash commands to be executed by recipes.
# Options are set to exit when a recipe line exits non-zero or a piped command fails.
SHELL = /usr/bin/env bash -o pipefail
.SHELLFLAGS = -ec

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

.PHONY: test
test: ## run tests
	go test ./...
