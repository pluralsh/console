.PHONY: build-proto ## generate gRPC client and server code
build-proto:
	protoc pkg/proto/*.proto \
        --go_out=. \
        --go_opt=paths=source_relative \
        --go-grpc_out=require_unimplemented_servers=false:. \
        --go-grpc_opt=paths=source_relative \
        --proto_path=.

.PHONY: build ## build cloud-query binary
build:
	@echo "Building cloud-query binary..."
	CGO_ENABLED=1 go build -ldflags '-extldflags=-fno-PIC' -o bin/cloud-query cmd/*.go

.PHONY: docker ## build cloud-query docker image
docker:
	@echo "Building cloud-query docker image..."
	docker build -t cloud-query:latest .

.PHONY: run ## run cloud-query server
run: docker
	@echo "Running cloud-query server..."
	docker run --rm -p 9192:9192 cloud-query:latest