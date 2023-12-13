IMG ?= deployment-controller:latest # Image URL to use all building/pushing image targets
CONTROLLER_GEN = $(shell which controller-gen)

ifndef GOPATH
$(error $$GOPATH environment variable not set)
endif

ifeq (,$(findstring $(GOPATH)/bin,$(PATH)))
$(error $$GOPATH/bin directory is not in your $$PATH)
endif

##@ General

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

.PHONY: install-tools
install-tools: ## install required tools
	@cat tools.go | grep _ | awk -F'"' '{print $$2}' | xargs -tI {} go install {}

##@ Build

.PHONY: build
build: manifests generate ## build
	go build -o bin/deployment-controller main.go

docker-build: ## build Docker image with the driver
	docker build --no-cache -t ${IMG} .

docker-push: ## push Docker image with the driver
	docker push ${IMG}

##@ Codegen

.PHONY: manifests
manifests: install-tools ## generate Kubernetes manifests
	$(CONTROLLER_GEN) crd rbac:roleName=manager-role webhook paths="./..." output:crd:artifacts:config=config/crd/bases

.PHONY: generate
generate: install-tools ## generate code containing DeepCopy, DeepCopyInto, and DeepCopyObject method implementations
	go generate ./pkg/...
	$(CONTROLLER_GEN) object:headerFile="hack/boilerplate.go.txt" paths="./..."

.PHONY: genmock
genmock: ## generates mocks before running tests
	hack/gen-client-mocks.sh

##@ Tests

.PHONY: test
test: genmock ## run tests
	go test ./... -v

.PHONY: lint
lint: install-tools ## run linters
	golangci-lint run ./...

.PHONY: fix
fix: install-tools ## fix issues found by linters
	golangci-lint run --fix ./...

##@ Utils

apply-crds: ## applies CRDs
	kubectl apply -f config/crd/bases
