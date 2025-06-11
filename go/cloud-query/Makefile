build-proto: ## generate gRPC client and server code
	protoc pkg/proto/*.proto \
        --go_out=. \
        --go_opt=paths=source_relative \
        --go-grpc_out=require_unimplemented_servers=false:. \
        --go-grpc_opt=paths=source_relative \
        --proto_path=.

build-steampipe: ## run the steampipe server
	docker build --no-cache -t steampipe -f steampipe.Dockerfile .

run-steampipe: build-steampipe ## run the steampipe server
	docker run --rm -p 9193:9193 steampipe