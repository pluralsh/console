ROOT_DIRECTORY = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))/..

include $(ROOT_DIRECTORY)/go/paths.mk
include $(TOOLS_MAKEFILE)

##@ General

.PHONY: help
help: ## show help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

.PHONY: tools
tools: ## install required tools
	@$(MAKE) --no-print-directory --directory=$(TOOLS_DIR) tools

##@ Static checks

.PHONY: lint-packages
lint-packages: ## print workspace packages to lint
	@go work edit -json | jq -r '.Use[].DiskPath' | grep -v './nexus' | grep -v './tools' | sed 's|$$|/...|' | tr '\n' ' '

.PHONY: lint
lint: TOOL = golangci-lint
lint: --tool ## run linters
	@packages=$$($(MAKE) --no-print-directory lint-packages); \
		$(GOLANGCI_LINT) run -c $(GOLANGCI_LINT_CONFIG) $$packages

.PHONY: fix
lint: TOOL = golangci-lint
fix: --tool ## fix issues found by linters
	@packages=$$($(MAKE) --no-print-directory lint-packages); \
		$(GOLANGCI_LINT) run -c $(GOLANGCI_LINT_CONFIG) --fix $$packages

# Image URL to use all building/pushing image targets
IMG_NAME ?= deployment-controller
IMG_TAG ?= master

##@ Docker

# If you wish to build the controller image targeting other platforms you can use the --platform flag.
# (i.e. docker build --platform linux/arm64). However, you must enable docker buildKit for it.
# More info: https://docs.docker.com/develop/develop-images/build_enhancements/
docker-build: ## build controller docker image
	docker build --no-cache -t ${IMG_NAME}:${IMG_TAG} -f controller/Dockerfile .

# PLATFORMS defines the target platforms for the manager image be built to provide support to multiple
# architectures. (i.e. make docker-buildx IMG=myregistry/mypoperator:0.0.1). To use this option you need to:
# - be able to use docker buildx. More info: https://docs.docker.com/build/buildx/
# - have enabled BuildKit. More info: https://docs.docker.com/develop/develop-images/build_enhancements/
# - be able to push the image to your registry (i.e. if you do not set a valid value via IMG=<myregistry/image:<tag>> then the export will fail)
# To adequately provide solutions that are compatible with multiple platforms, you should consider using this option.
PLATFORMS ?= linux/arm64,linux/amd64,linux/s390x,linux/ppc64le
.PHONY: docker-buildx
docker-buildx: ## build and push controller docker image with cross-platform support
	# copy existing Dockerfile and insert --platform=${BUILDPLATFORM} into Dockerfile.cross, and preserve the original Dockerfile
	sed -e '1 s/\(^FROM\)/FROM --platform=\$$\{BUILDPLATFORM\}/; t' -e ' 1,// s//FROM --platform=\$$\{BUILDPLATFORM\}/' Dockerfile > Dockerfile.cross
	- docker buildx create --name project-v3-builder
	docker buildx use project-v3-builder
	- docker buildx build --push --platform=$(PLATFORMS) --tag ${IMG} -f Dockerfile.cross .
	- docker buildx rm project-v3-builder
	rm Dockerfile.cross

docker-push: ## push docker image with the manager
	docker push ${IMG_NAME}:${IMG_TAG}
