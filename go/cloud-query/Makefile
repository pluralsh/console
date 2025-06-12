ROOT_DIRECTORY := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))/../..

include $(ROOT_DIRECTORY)/go/paths.mk
include $(TOOLS_MAKEFILE)

##@ Build and run

.PHONY: build ## build the cloud-query binary
build:
	@echo "Building cloud-query binary..."
	CGO_ENABLED=1 go build -ldflags '-extldflags=-fno-PIC' -o bin/cloud-query cmd/*.go

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
		-e AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID} \
		-e AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY} \
		-e AWS_SESSION_TOKEN=${AWS_SESSION_TOKEN} \
		-e AZURE_SUBSCRIPTION_ID=${AZURE_SUBSCRIPTION_ID} \
		-e AZURE_TENANT_ID=${AZURE_TENANT_ID} \
		-e AZURE_CLIENT_ID=${AZURE_CLIENT_ID} \
		-e AZURE_CLIENT_SECRET=${AZURE_CLIENT_SECRET} \
		-e GCP_IMPERSONATION_TOKEN=${GCP_IMPERSONATION_TOKEN} \
		cloud-query:latest

##@ Codegen

.PHONY: proto
proto: TOOL = protoc-gen-go protoc-gen-go-grpc ## generate gRPC client and server code
	protoc internal/proto/*.proto \
        --go_out=. \
        --go_opt=paths=source_relative \
        --go-grpc_out=require_unimplemented_servers=false:. \
        --go-grpc_opt=paths=source_relative \
        --proto_path=.

##@ Tests and linters

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