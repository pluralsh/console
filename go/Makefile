ROOT_DIRECTORY := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))/..

include $(ROOT_DIRECTORY)/go/paths.mk
include $(TOOLS_MAKEFILE)

##@ Help

.PHONY: help
help: ## show help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

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
