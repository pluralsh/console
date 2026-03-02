ROOT_DIRECTORY := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))/../..

include $(ROOT_DIRECTORY)/go/paths.mk
include $(WORKSPACES_DIR)/common.mk
include $(TOOLS_MAKEFILE)

# Variables
BINARY_NAME := nexus
GO_FILES := $(shell find . -name '*.go' -not -path './proto/gen/*' -not -path './vendor/*')

# Version information
VERSION ?= $(shell git describe --tags --always --dirty)
GIT_COMMIT := $(shell git rev-parse HEAD)
BUILD_TIME := $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
LDFLAGS := -ldflags="-w -s \
	-X github.com/pluralsh/console/go/nexus/internal/version.Version=$(VERSION) \
	-X github.com/pluralsh/console/go/nexus/internal/version.GitCommit=$(GIT_COMMIT) \
	-X github.com/pluralsh/console/go/nexus/internal/version.BuildTime=$(BUILD_TIME)"

# Configuration for mocked Console client
NEXUS_AI_ENABLED := true
NEXUS_OPENAI_API_KEY := $(if $(NEXUS_OPENAI_API_KEY),$(NEXUS_OPENAI_API_KEY),"sk-xxxx")
NEXUS_OPENAI_MODEL := $(if $(NEXUS_OPENAI_MODEL),$(NEXUS_OPENAI_MODEL),"gpt-5-nano")
NEXUS_OPENAI_EMBEDDINGMODEL := $(if $(NEXUS_OPENAI_EMBEDDINGMODEL),$(NEXUS_OPENAI_EMBEDDINGMODEL),"text-embedding-3-small")
NEXUS_ANTHROPIC_API_KEY := $(if $(NEXUS_ANTHROPIC_API_KEY),$(NEXUS_ANTHROPIC_API_KEY),"sk-xxxx")
NEXUS_ANTHROPIC_MODEL := $(if $(NEXUS_ANTHROPIC_MODEL),$(NEXUS_ANTHROPIC_MODEL),"claude-sonnet-4-20250514")
NEXUS_ANTHROPIC_TOOLMODEL := $(if $(NEXUS_ANTHROPIC_TOOLMODEL),$(NEXUS_ANTHROPIC_TOOLMODEL),"claude-haiku-20250514")

# Default target
.DEFAULT_GOAL := help

##@ General

.PHONY: build
build: proto ## build the binary
	@echo "Building $(BINARY_NAME)..."
	go build $(LDFLAGS) -o bin/$(BINARY_NAME) ./cmd/main.go

.PHONY: run
run: ## run the service locally
	@echo "Running $(BINARY_NAME)..."
	NEXUS_AI_ENABLED=$(NEXUS_AI_ENABLED) \
	NEXUS_OPENAI_API_KEY=$(NEXUS_OPENAI_API_KEY) \
	NEXUS_OPENAI_MODEL=$(NEXUS_OPENAI_MODEL) \
	NEXUS_OPENAI_EMBEDDINGMODEL=$(NEXUS_OPENAI_EMBEDDINGMODEL) \
	NEXUS_ANTHROPIC_API_KEY=$(NEXUS_ANTHROPIC_API_KEY) \
	NEXUS_ANTHROPIC_MODEL=$(NEXUS_ANTHROPIC_MODEL) \
	NEXUS_ANTHROPIC_TOOLMODEL=$(NEXUS_ANTHROPIC_TOOLMODEL) \
	go run ./cmd/main.go \
		--config config/config.yaml

.PHONY: clean
clean: ## clean build artifacts
	@echo "Cleaning build artifacts..."
	rm -rf bin/
	rm -rf dist/
	rm -f coverage.txt coverage.html

.PHONY: test
test: TOOL = gotestsum
test: --tool ## run tests
	@echo "Running tests..."
	$(GOTESTSUM) --format testname -- -race -count=1 ./...

.PHONY: test-coverage
test-coverage: TOOL = gotestsum
test-coverage: --tool ## run tests with coverage
	@echo "Running tests with coverage..."
	$(GOTESTSUM) --format testname -- -race -coverprofile=coverage.txt -covermode=atomic ./...
	go tool cover -html=coverage.txt -o coverage.html
	@echo "Coverage report generated: coverage.html"

##@ Codegen

.PHONY: proto
proto: TOOL = protoc-gen-go protoc-gen-go-grpc
proto: --tool install-protoc ## generate protobuf code
	$(PROTOC) \
        --plugin=protoc-gen-go=$(BINARIES_DIR)/protoc-gen-go \
        --plugin=protoc-gen-go-grpc=$(BINARIES_DIR)/protoc-gen-go-grpc \
		--go_out=. \
		--go-grpc_out=. \
        --proto_path=proto \
        proto/*.proto

##@ Deployment

.PHONY: docker-build
docker-build: ## build the Docker image
	@echo "Building Docker image..."
	docker build \
		--build-arg VERSION=$(VERSION) \
		--build-arg GIT_COMMIT=$(GIT_COMMIT) \
		--build-arg BUILD_TIME=$(BUILD_TIME) \
		-t ghcr.io/pluralsh/nexus:$(VERSION) \
		-t ghcr.io/pluralsh/nexus:latest \
		.
