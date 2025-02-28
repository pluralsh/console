ROOT_DIRECTORY := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))/../..

include $(ROOT_DIRECTORY)/go/paths.mk
include $(TOOLS_MAKEFILE)

# Image tag used to deploy controller with helm
IMG_TAG ?= master

# Config variables used for testing
DEFAULT_PLURAL_CONSOLE_URL := "https://console.plrl-dev-aws.onplural.sh")
PLURAL_CONSOLE_URL := $(if $(PLURAL_CONSOLE_URL),$(PLURAL_CONSOLE_URL),$(DEFAULT_PLURAL_CONSOLE_URL))

# Tool versions
ENVTEST_K8S_VERSION := 1.28.3

# Setting SHELL to bash allows bash commands to be executed by recipes.
# Options are set to exit when a recipe line exits non-zero or a piped command fails.
SHELL = /usr/bin/env bash -o pipefail
.SHELLFLAGS = -ec

# Validate required env variables
ifndef PLURAL_CONSOLE_TOKEN
$(warning $$PLURAL_CONSOLE_TOKEN environment variable not set. Deploy will not work.)
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

.PHONY: build
build: manifests generate fmt vet ## build manager binary
	go build -o bin/manager cmd/main.go

.PHONY: run
run: manifests generate fmt vet ## run a controller from your host
	go run ./cmd/main.go \
		--console-url=${PLURAL_CONSOLE_URL}/gql

.PHONY: release
release: manifests generate fmt vet ## builds release version of the app. Requires GoReleaser to work.
	goreleaser build --clean --single-target --snapshot

##@ Tests / Lint

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

.PHONY: test
test: TOOL = envtest controller-gen mockery
test: --tool manifests generate genmock fmt vet ## run tests
	@KUBEBUILDER_ASSETS="$(shell $(ENVTEST) use $(ENVTEST_K8S_VERSION) --bin-dir $(BINARIES_DIR) -p path)" go test $$(go list ./... | grep -v /e2e) -v

.PHONY: e2e
e2e: ## run e2e tests
	@go test ./internal/test/e2e/ -v -ginkgo.v

##@ Codegen

.PHONY: codegen
codegen: manifests generate genmock codegen-helm codegen-crd-docs ## runs all codegen-related targets

.PHONY: manifests
manifests: TOOL = controller-gen
manifests: --tool ## generate WebhookConfiguration, ClusterRole and CustomResourceDefinition objects
	$(CONTROLLER_GEN) rbac:roleName=manager-role crd:generateEmbeddedObjectMeta=true webhook paths="./..." output:crd:artifacts:config=config/crd/bases
	@$(MAKE) -s codegen-chart-crds

.PHONY: generate
generate: TOOL = controller-gen
generate: --tool ## generate code containing DeepCopy, DeepCopyInto, and DeepCopyObject method implementations
	$(CONTROLLER_GEN) object:headerFile=$(BOILERPLATE_FILE) paths="./..."

.PHONY: genmock
genmock: TOOL = mockery
genmock: ## generates mocks before running tests
	$(MOCKERY)

.PHONY: codegen-helm
codegen-helm: TOOL = kustomize helmify
codegen-helm: --tool manifests ## generate controller helm chart with kustomize
	@rm -rf tmp/
	@$(KUSTOMIZE) build config/default | $(HELMIFY) -generate-defaults -image-pull-secrets -crd-dir tmp/charts/controller
	@find tmp/charts/controller -type f -exec sed -i 's/app.kubernetes.io\/managed-by: kustomize/app.kubernetes.io\/managed-by: helm/g' {} \;

.PHONY: codegen-chart-crds
codegen-chart-crds: ## copy CRDs to the controller helm chart
	@cp -a config/crd/bases/. $(CONTROLLER_CHART_DIR)/crds
	@cp -a $(CONTROLLER_CHART_DIR)/crds/. $(PLURAL_CONSOLE_CHART_DIR)/crds

.PHONY: codegen-crd-docs
codegen-crd-docs: TOOL = crd-ref-docs
codegen-crd-docs: --tool ## generate docs from the CRDs
	$(CRDDOCS) --source-path=./api --renderer=markdown --output-path=./docs/api.md --config=config.yaml

##@ Deployment

.PHONY: deploy-crds-kustomize
deploy-crds-kustomize: TOOL = kustomize
deploy-crds-kustomize: --tool manifests ## deploy CRDs into the K8s cluster specified in ~/.kube/config.
	$(KUSTOMIZE) build config/crd | $(KUBECTL) apply -f -

ifndef ignore-not-found
  ignore-not-found = false
endif

.PHONY: undeploy-crds-kustomize
undeploy-crds-kustomize: TOOL = kustomize
undeploy-crds-kustomize: --tool manifests ## undeploy CRDs from the K8s cluster specified in ~/.kube/config. Call with ignore-not-found=true to ignore resource not found errors during deletion.
	$(KUSTOMIZE) build config/crd | $(KUBECTL) delete --ignore-not-found=$(ignore-not-found) -f -

.PHONY: deploy-kustomize
deploy-kustomize: TOOL = kustomize
deploy-kustomize: --tool manifests deploy-crds-kustomize ## deploy controller to the K8s cluster specified in ~/.kube/config.
	$(KUSTOMIZE) build config/default | $(ENVSUBST) | $(KUBECTL) apply -f -

.PHONY: undeploy-kustomize
undeploy-kustomize: TOOL = kustomize
undeploy-kustomize: --tool manifests ## undeploy controller from the K8s cluster specified in ~/.kube/config. Call with ignore-not-found=true to ignore resource not found errors during deletion.
	$(KUSTOMIZE) build config/default | $(KUBECTL) delete --ignore-not-found=$(ignore-not-found) -f -

.PHONY: deploy-helm
deploy-helm: NAMESPACE := console
deploy-helm: RELEASE_NAME := controller-manager
deploy-helm: manifests ## deploy controller to the K8S cluster specified in ~/.kube/config via helm
	@$(HELM) upgrade --install --create-namespace --namespace $(NAMESPACE) --set consoleUrl=$(PLURAL_CONSOLE_URL) $(RELEASE_NAME) --set controllerManager.manager.image.tag=$(IMG_TAG) $(CONTROLLER_CHART_DIR)

.PHONY: undeploy-helm
undeploy-helm: NAMESPACE := console
undeploy-helm: RELEASE_NAME := controller-manager
undeploy-helm: manifests ## undeploy controller from the K8S cluster specified in ~/.kube/config via helm
	@$(HELM) uninstall --namespace $(NAMESPACE) $(RELEASE_NAME)
