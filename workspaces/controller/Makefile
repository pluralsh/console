ROOT_DIRECTORY := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))/../..

include $(ROOT_DIRECTORY)/workspaces/paths.mk
include $(TOOLS_BINARIES_MAKEFILE)

# Image URL to use all building/pushing image targets
IMG_NAME ?= deployment-controller
IMG_TAG ?= master

# Config variables used for testing
DEFAULT_PLURAL_CONSOLE_URL := "https://console.plrl-dev-aws.onplural.sh")
PLURAL_CONSOLE_URL := $(if $(PLURAL_CONSOLE_URL),$(PLURAL_CONSOLE_URL),$(DEFAULT_PLURAL_CONSOLE_URL))

# Tool binaries
KUBECTL ?= $(shell which kubectl)
KUSTOMIZE ?= $(shell which kustomize)
HELMIFY ?= $(shell which helmify)
CONTROLLER_GEN ?= $(shell which controller-gen)
ENVTEST ?= $(shell which setup-envtest)
GOLANGCI_LINT ?= $(shell which golangci-lint)
MOCKERY ?= $(shell which mockery)
ENVSUBST ?= $(shell which envsubst)
HELM ?= $(shell which helm)
CRDDOCS ?= $(shell which crd-ref-docs)

# Tool versions
KUBEBUILDER_VERSION := 3.11.1
ENVTEST_K8S_VERSION := 1.28.3

# Setting SHELL to bash allows bash commands to be executed by recipes.
# Options are set to exit when a recipe line exits non-zero or a piped command fails.
SHELL = /usr/bin/env bash -o pipefail
.SHELLFLAGS = -ec

# Validate required env variables
ifndef PLURAL_CONSOLE_TOKEN
$(warning $$PLURAL_CONSOLE_TOKEN environment variable not set. Deploy will not work.)
endif

.PHONY: all
all: build

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

.PHONY: crd-docs
crd-docs: ##generate docs from the CRDs
	$(CRDDOCS) --source-path=./api --renderer=markdown --output-path=./docs/api.md --config=config.yaml

##@ Build

.PHONY: build
build: manifests generate fmt vet ## build manager binary
	go build -o bin/manager cmd/main.go

.PHONY: run
run: manifests generate chart-rbac fmt vet ## run a controller from your host
	go run ./cmd/main.go \
		--console-url=${PLURAL_CONSOLE_URL}/gql

.PHONY: release
release: manifests generate fmt vet ## builds release version of the app. Requires GoReleaser to work.
	goreleaser build --clean --single-target --snapshot

# If you wish to build the manager image targeting other platforms you can use the --platform flag.
# (i.e. docker build --platform linux/arm64). However, you must enable docker buildKit for it.
# More info: https://docs.docker.com/develop/develop-images/build_enhancements/
docker-build: ## build Docker image with the manager
	docker build --no-cache -t ${IMG_NAME}:${IMG_TAG} .

docker-push: ## push docker image with the manager
	docker push ${IMG_NAME}:${IMG_TAG}

# PLATFORMS defines the target platforms for the manager image be built to provide support to multiple
# architectures. (i.e. make docker-buildx IMG=myregistry/mypoperator:0.0.1). To use this option you need to:
# - be able to use docker buildx. More info: https://docs.docker.com/build/buildx/
# - have enabled BuildKit. More info: https://docs.docker.com/develop/develop-images/build_enhancements/
# - be able to push the image to your registry (i.e. if you do not set a valid value via IMG=<myregistry/image:<tag>> then the export will fail)
# To adequately provide solutions that are compatible with multiple platforms, you should consider using this option.
PLATFORMS ?= linux/arm64,linux/amd64,linux/s390x,linux/ppc64le
.PHONY: docker-buildx
docker-buildx: ## build and push docker image for the manager for cross-platform support
	# copy existing Dockerfile and insert --platform=${BUILDPLATFORM} into Dockerfile.cross, and preserve the original Dockerfile
	sed -e '1 s/\(^FROM\)/FROM --platform=\$$\{BUILDPLATFORM\}/; t' -e ' 1,// s//FROM --platform=\$$\{BUILDPLATFORM\}/' Dockerfile > Dockerfile.cross
	- docker buildx create --name project-v3-builder
	docker buildx use project-v3-builder
	- docker buildx build --push --platform=$(PLATFORMS) --tag ${IMG} -f Dockerfile.cross .
	- docker buildx rm project-v3-builder
	rm Dockerfile.cross

##@ Codegen

.PHONY: manifests
manifests: ## generate WebhookConfiguration, ClusterRole and CustomResourceDefinition objects
	$(CONTROLLER_GEN) rbac:roleName=manager-role crd:generateEmbeddedObjectMeta=true webhook paths="./..." output:crd:artifacts:config=config/crd/bases
	@$(MAKE) -s chart-crds

.PHONY: generate
generate: ## generate code containing DeepCopy, DeepCopyInto, and DeepCopyObject method implementations
	$(CONTROLLER_GEN) object:headerFile=$(BOILERPLATE_FILE) paths="./..."

.PHONY: genmock
genmock: ## generates mocks before running tests
	$(MOCKERY)

##@ Tests

.PHONY: fmt
fmt: ## run go fmt against code
	@go fmt ./...

.PHONY: vet
vet: ## run go vet against code
	@go vet ./...

.PHONY: lint
lint: ## run linters
	@$(GOLANGCI_LINT) run ./...

.PHONY: fix
fix: ## fix issues found by linters
	@$(GOLANGCI_LINT) run --fix ./...

.PHONY: test
test: manifests generate genmock fmt vet ## run tests
	@KUBEBUILDER_ASSETS="$(shell $(ENVTEST) use $(ENVTEST_K8S_VERSION) --bin-dir $(GOPATH)/bin -p path)" go test $$(go list ./... | grep -v /e2e) -v

.PHONY: e2e
e2e: ## run e2e tests
	@go test ./internal/test/e2e/ -v -ginkgo.v

##@ Deployment

ifndef ignore-not-found
  ignore-not-found = false
endif

.PHONY: helm
helm: manifests
	@rm -rf tmp/
	@$(KUSTOMIZE) build config/default | $(HELMIFY) -generate-defaults -image-pull-secrets -crd-dir tmp/charts/controller
	@find tmp/charts/controller -type f -exec sed -i 's/app.kubernetes.io\/managed-by: kustomize/app.kubernetes.io\/managed-by: helm/g' {} \;

.PHONY: chart-crds
chart-crds:
	@cp -a config/crd/bases/. $(CONTROLLER_CHART_DIR)/crds
	@cp -a $(CONTROLLER_CHART_DIR)/crds/. $(PLURAL_CONSOLE_CHART_DIR)/crds

.PHONY: chart-rbac
chart-rbac: helm
	@cp -a tmp/charts/controller/templates/manager-rbac.yaml $(CONTROLLER_CHART_DIR)/templates

.PHONY: install
install: manifests ## Install CRDs into the K8s cluster specified in ~/.kube/config.
	$(KUSTOMIZE) build config/crd | $(KUBECTL) apply -f -

.PHONY: uninstall
uninstall: manifests ## Uninstall CRDs from the K8s cluster specified in ~/.kube/config. Call with ignore-not-found=true to ignore resource not found errors during deletion.
	$(KUSTOMIZE) build config/crd | $(KUBECTL) delete --ignore-not-found=$(ignore-not-found) -f -

.PHONY: uninstall-helm
uninstall-helm: NAMESPACE := console
uninstall-helm: RELEASE_NAME := controller-manager
uninstall-helm: manifests
	@$(HELM) uninstall --namespace $(NAMESPACE) $(RELEASE_NAME)

.PHONY: deploy
deploy: manifests ## Deploy controller to the K8s cluster specified in ~/.kube/config.
	$(KUSTOMIZE) build config/default | $(ENVSUBST) | $(KUBECTL) apply -f -

.PHONY: deploy-helm
deploy-helm: NAMESPACE := console
deploy-helm: RELEASE_NAME := controller-manager
deploy-helm: manifests
	@$(HELM) upgrade --install --create-namespace --namespace $(NAMESPACE) --set consoleUrl=$(PLURAL_CONSOLE_URL) $(RELEASE_NAME) --set controllerManager.manager.image.tag=$(IMG_TAG) ../charts/controller

.PHONY: undeploy
undeploy: ## Undeploy controller from the K8s cluster specified in ~/.kube/config. Call with ignore-not-found=true to ignore resource not found errors during deletion.
	$(KUSTOMIZE) build config/default | $(KUBECTL) delete --ignore-not-found=$(ignore-not-found) -f -

.PHONY: tools
tools: ## Installs all required tools
	@$(MAKE) --directory=$(TOOLS_DIR) --no-print-directory
