##@ Build and run

.PHONY: build
build: proto ## build the binary
	go build -o bin/cloud-query main.go

.PHONY: image
image: ## build the Docker image
	docker build --no-cache -t steampipe -f steampipe.Dockerfile .

.PHONY: run
run: image ## run the Docker image
	docker run --rm -p 9193:9193 steampipe

##@ Codegen

.PHONY: proto
proto: ## generate gRPC client and server code
	protoc pkg/proto/*.proto \
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