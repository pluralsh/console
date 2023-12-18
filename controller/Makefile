ROOT_DIRECTORY := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

include $(ROOT_DIRECTORY)/hack/include/build.mk

# Image URL to use all building/pushing image targets
IMG ?= deployment-controller:latest

# Tool binaries
KUBECTL ?= $(shell which kubectl)
KUSTOMIZE ?= $(shell which kustomize)
CONTROLLER_GEN ?= $(shell which controller-gen)
ENVTEST ?= $(shell which setup-envtest)
GOLANGCI_LINT ?= $(shell which golangci-lint)
MOCKERY ?= $(shell which mockery)

# Tool versions
KUBEBUILDER_VERSION := 3.11.1
ENVTEST_K8S_VERSION := 1.28.3

# Setting SHELL to bash allows bash commands to be executed by recipes.
# Options are set to exit when a recipe line exits non-zero or a piped command fails.
SHELL = /usr/bin/env bash -o pipefail
.SHELLFLAGS = -ec

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

##@ Build

.PHONY: build
build: manifests generate fmt vet ## build manager binary
	go build -o bin/manager cmd/main.go

.PHONY: run
run: manifests generate fmt vet ## run a controller from your host
	go run ./cmd/main.go

.PHONY: release
release: manifests generate fmt vet ## builds release version of the app. Requires GoReleaser to work.
	goreleaser build --clean --single-target --snapshot

docker-build: ## build Docker image with the driver
	docker build --no-cache -t ${IMG} .

docker-push: ## push Docker image with the driver
	docker push ${IMG}

##@ Codegen

.PHONY: manifests
manifests: controller-gen ## generate WebhookConfiguration, ClusterRole and CustomResourceDefinition objects
	$(CONTROLLER_GEN) rbac:roleName=manager-role crd webhook paths="./..." output:crd:artifacts:config=config/crd/bases

.PHONY: generate
generate: controller-gen ## generate code containing DeepCopy, DeepCopyInto, and DeepCopyObject method implementations
	go generate ./pkg/...
	$(CONTROLLER_GEN) object:headerFile="hack/boilerplate.go.txt" paths="./..."

.PHONY: genmock
genmock: mockery ## generates mocks before running tests
	@$(MOCKERY)

##@ Tests

.PHONY: fmt
fmt: ## run go fmt against code
	@go fmt ./...

.PHONY: vet
vet: ## run go vet against code
	@go vet ./...

.PHONY: lint
lint: golangci-lint ## run linters
	@$(GOLANGCI_LINT) run ./...

.PHONY: fix
fix: golangci-lint ## fix issues found by linters
	@$(GOLANGCI_LINT) run --fix ./...

.PHONY: test
test: manifests generate genmock fmt vet envtest ## run tests
	@KUBEBUILDER_ASSETS="$(shell $(ENVTEST) use $(ENVTEST_K8S_VERSION) --bin-dir $(GOPATH)/bin -p path)" go test $$(go list ./... | grep -v /e2e) -v

.PHONY: e2e
e2e: ## run e2e tests
	@go test ./internal/test/e2e/ -v -ginkgo.v

##@ Deployment

ifndef ignore-not-found
  ignore-not-found = false
endif

.PHONY: install
install: manifests kustomize ## Install CRDs into the K8s cluster specified in ~/.kube/config.
	$(KUSTOMIZE) build config/crd | $(KUBECTL) apply -f -

.PHONY: uninstall
uninstall: manifests kustomize ## Uninstall CRDs from the K8s cluster specified in ~/.kube/config. Call with ignore-not-found=true to ignore resource not found errors during deletion.
	$(KUSTOMIZE) build config/crd | $(KUBECTL) delete --ignore-not-found=$(ignore-not-found) -f -

.PHONY: deploy
deploy: manifests kustomize ## Deploy controller to the K8s cluster specified in ~/.kube/config.
	cd config/manager && $(KUSTOMIZE) edit set image controller=${IMG}
	$(KUSTOMIZE) build config/default | $(KUBECTL) apply -f -

.PHONY: undeploy
undeploy: kustomize ## Undeploy controller from the K8s cluster specified in ~/.kube/config. Call with ignore-not-found=true to ignore resource not found errors during deletion.
	$(KUSTOMIZE) build config/default | $(KUBECTL) delete --ignore-not-found=$(ignore-not-found) -f -

##@ Build Dependencies

.PHONY: tools
tools: ## install required tools
tools: --tool

.PHONY: --tool
%--tool: TOOL = .*
--tool: # INTERNAL: installs tool with name provided via $(TOOL) variable or all tools.
	@cat tools.go | grep _ | awk -F'"' '$$2 ~ /$(TOOL)/ {print $$2}' | xargs -I {} go install {}

.PHONY: controller-gen
controller-gen: TOOL = controller-gen
controller-gen: --tool ## Download and install controller-gen in the $GOPATH/bin

.PHONY: kustomize
kustomize: TOOL = kustomize
kustomize: --tool ## Download and install kustomize in the $GOPATH/bin

.PHONY: golangci-lint
golangci-lint: TOOL = golangci-lint
golangci-lint: --tool ## Download and install golangci-lint in the $GOPATH/bin

.PHONY: envtest
envtest: TOOL = setup-envtest
envtest: --tool ## Download and install setup-envtest in the $GOPATH/bin

.PHONY: mockery
mockery: TOOL = mockery
mockery: --tool

.PHONY: kubebuilder
kubebuilder: ## install kubebuilder
	@curl -L -O --output-dir bin/ "https://github.com/kubernetes-sigs/kubebuilder/releases/download/v${KUBEBUILDER_VERSION}/kubebuilder_${OS}_${ARCH}"
	@chmod +x bin/kubebuilder_${OS}_${ARCH}
	@mv bin/kubebuilder_${OS}_${ARCH} ${GOPATH}/bin/kubebuilder
