# Image URL to use all building/pushing image targets
IMG ?= deployment-controller:latest

ifndef GOPATH
$(error $$GOPATH environment variable not set)
endif

ifeq (,$(findstring $(GOPATH)/bin,$(PATH)))
$(error $$GOPATH/bin directory is not in your $$PATH)
endif

ifeq (,$(shell go env GOBIN))
GOBIN=$(shell go env GOPATH)/bin
else
GOBIN=$(shell go env GOBIN)
endif

CONTROLLER_GEN = $(shell pwd)/bin/controller-gen
controller-gen: ## Download controller-gen locally if necessary.
	$(call go-get-tool,$(CONTROLLER_GEN),sigs.k8s.io/controller-tools/cmd/controller-gen@v0.11.3)

##@ Build

docker-build: ## Build docker image with the driver.
	docker build --no-cache -t ${IMG} .

docker-push: ## Push docker image with the driver.
	docker push ${IMG}

genmock: ## generates mocks before running tests
	hack/gen-client-mocks.sh

apply-crds: ## applies CRDs
	kubectl apply -f config/crd/bases

apply-cluster-byok: apply-crds ## applies BYOK cluster
	kubectl apply -f config/crd/examples/cluster_byok.yaml

# go-get-tool will 'go get' any package $2 and install it to $1.
PROJECT_DIR := $(shell dirname $(abspath $(lastword $(MAKEFILE_LIST))))
define go-get-tool
@[ -f $(1) ] || { \
set -e ;\
TMP_DIR=$$(mktemp -d) ;\
cd $$TMP_DIR ;\
go mod init tmp ;\
echo "Downloading $(2)" ;\
GOBIN=$(PROJECT_DIR)/bin go install $(2) ;\
rm -rf $$TMP_DIR ;\
}
endef

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

##@ Codegen

.PHONY: manifests
manifests: controller-gen ## generate Kubernetes manifests
	$(CONTROLLER_GEN) crd rbac:roleName=manager-role webhook paths="./..." output:crd:artifacts:config=config/crd/bases

.PHONY: generate
generate: controller-gen ## generate code containing DeepCopy, DeepCopyInto, and DeepCopyObject method implementations
	go generate ./pkg/...
	$(CONTROLLER_GEN) object:headerFile="hack/boilerplate.go.txt" paths="./..."

##@ Tests

.PHONY: test
test: ## run tests
	go test ./... -v

.PHONY: lint
lint: install-tools ## run linters
	golangci-lint run ./...

.PHONY: fix
fix: install-tools ## fix issues found by linters
	golangci-lint run --fix ./...
