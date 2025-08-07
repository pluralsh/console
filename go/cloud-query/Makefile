ROOT_DIRECTORY := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))/../..

include $(ROOT_DIRECTORY)/go/paths.mk
include $(TOOLS_MAKEFILE)

DIST_DIR=$(CLOUD_QUERY_DIR)/bin
BINARY_NAME=cloud-query

##@ Build and run

.PHONY: build ## build the cloud-query binary
build:
	@echo "Building cloud-query binary..."
	@CGO_ENABLED=0 go build -o "${DIST_DIR}/${BINARY_NAME}" cmd/*.go

.PHONY: image
image: ## build the Docker image
	@echo "Building cloud-query docker image..."
	docker build --no-cache -t cloud-query:latest .
	@echo "Building cloud-query-db docker image..."
	docker build --no-cache -t cloud-query-db:latest -f db.Dockerfile .

.PHONY: run
run: down ## run the Docker compose
	@echo "Running cloud-query..."
	docker-compose up --build -d

.PHONY: down
down: ## stop the Docker compose
	@echo "Stopping cloud-query..."
	docker-compose down

.PHONY: clean
clean: ## clean up build/db artifacts
	@echo "Cleaning up"
	@rm -rf $(DIST_DIR)/dump/*

##@ Codegen

.PHONY: proto
proto: TOOL = protoc-gen-go protoc-gen-go-grpc
proto: --tool install-protoc ## generate gRPC client and server code
	$(PROTOC) \
        --plugin=protoc-gen-go=$(BINARIES_DIR)/protoc-gen-go \
        --plugin=protoc-gen-go-grpc=$(BINARIES_DIR)/protoc-gen-go-grpc \
		--go_out=. \
		--go-grpc_out=. \
        --proto_path=api/proto \
        api/proto/*.proto

##@ Test and lint

.PHONY: test
test: ## run tests
	@echo "Running tests..."
	go test ./...

.PHONY: fmt
fmt: ## run go fmt against code
	@go fmt ./...

.PHONY: vet
vet: ## run go vet against code
	@go vet ./...

.PHONY: lint
lint: TOOL = golangci-lint
lint: --tool ## run linters
	@$(GOLANGCI_LINT) run ./...

.PHONY: fix
fix: TOOL = golangci-lint
fix: --tool ## fix issues found by linters
	@$(GOLANGCI_LINT) run --fix ./...

##@ Misc

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

.PHONY: --download-extensions
--download-extensions: ## INTERNAL: download postgres extensions
	@./hack/postgres.sh -p aws -d $(DIST_DIR) -v 1.20.0
	@./hack/postgres.sh -p gcp -d $(DIST_DIR) -v 1.10.0
	@./hack/postgres.sh -p azure -d $(DIST_DIR) -v 1.4.0