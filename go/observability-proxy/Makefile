ROOT_DIRECTORY := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))/../..

include $(ROOT_DIRECTORY)/go/paths.mk
include $(WORKSPACES_DIR)/common.mk
include $(TOOLS_MAKEFILE)

BINARY_NAME := observability-proxy
GO_FILES := $(shell find . -name '*.go' -not -path './vendor/*')

VERSION ?= $(shell git describe --tags --always --dirty)

.DEFAULT_GOAL := help

##@ General

.PHONY: build
build: ## build proxy binary
	go build -o bin/$(BINARY_NAME) ./cmd/proxy

.PHONY: run
run: ## run proxy locally
	go run ./cmd/proxy

.PHONY: test
test: ## run tests
	go test ./...

.PHONY: tidy
tidy: ## tidy module dependencies
	go mod tidy

##@ Codegen

.PHONY: proto
proto: TOOL = protoc-gen-go protoc-gen-go-grpc
proto: ## generate protobuf code from shared proto
	$(PROTOC) \
		--plugin=protoc-gen-go=$(BINARIES_DIR)/protoc-gen-go \
		--plugin=protoc-gen-go-grpc=$(BINARIES_DIR)/protoc-gen-go-grpc \
		--go_out=. \
		--go-grpc_out=. \
		--proto_path=$(ROOT_DIRECTORY)/proto \
		$(ROOT_DIRECTORY)/proto/console.proto

##@ Docker

.PHONY: docker-build
docker-build: ## build proxy docker image
	docker build -t ghcr.io/pluralsh/observability-proxy:$(VERSION) .

.PHONY: up-docker
up-docker: ## run local integration docker compose environment
	docker compose -f docker-compose.yml up --build

.PHONY: down-docker
down-docker: ## stop local integration docker compose environment
	docker compose -f docker-compose.yml down --remove-orphans
