ROOT_DIRECTORY := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))/../..

include $(ROOT_DIRECTORY)/go/paths.mk
include $(TOOLS_MAKEFILE)

DIST_DIR=$(CLOUD_QUERY_DIR)/bin
BINARY_NAME=cloud-query

##@ Build and run

.PHONY: build ## build the cloud-query binary
build: --download-extensions
	@echo "Building cloud-query binary..."
	@CGO_ENABLED=0 go build -o "${DIST_DIR}/${BINARY_NAME}" cmd/*.go

.PHONY: image
image: ## build the Docker image
	@echo "Building cloud-query docker image..."
	docker build -t cloud-query:latest .


# run: Build (if BUILD=true) and run the cloud-query Docker image locally.
# Usage: make run BUILD=true or BUILD=true make run
# If BUILD=true is set, the Docker image will be built before running.
.PHONY: run
run: $(if $(filter true,$(BUILD)),image) ## run the Docker image
	@echo "Running cloud-query server..."
	docker run \
		--rm \
		-p 9192:9192 \
		cloud-query:latest

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
	@./hack/postgres.sh -p aws -d $(DIST_DIR) -v 1.14.1
	@./hack/postgres.sh -p gcp -d $(DIST_DIR) -v 1.8.0
	@./hack/postgres.sh -p azure -d $(DIST_DIR) -v 1.4.0