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

##@ Docker Compose

.PHONY: up-docker
up-docker: ## build and run via docker compose
	docker compose -f docker-compose.yml up --build

.PHONY: test-docker
test-docker: ## run tests via docker compose
	@docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from oci-auth-test; \
	status=$$?; \
	docker compose -f docker-compose.test.yml down; \
	exit $$status

.PHONY: build-docker
build-docker: ## build docker image via compose
	docker compose -f docker-compose.yml build
