ROOT_DIRECTORY := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))/../..

include $(ROOT_DIRECTORY)/go/paths.mk
include $(WORKSPACES_DIR)/common.mk
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

##@ Misc

.PHONY: --download-extensions
--download-extensions: ## INTERNAL: download postgres extensions
	@./hack/postgres.sh -p aws -d $(DIST_DIR) -v 1.20.0
	@./hack/postgres.sh -p gcp -d $(DIST_DIR) -v 1.10.0
	@./hack/postgres.sh -p azure -d $(DIST_DIR) -v 1.4.0
