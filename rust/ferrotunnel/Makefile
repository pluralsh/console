ROOT_DIRECTORY := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))/../..

CRD_BASES := $(ROOT_DIRECTORY)/go/deployment-operator/config/crd/bases
TUNNEL_CLIENT_CRD := $(CRD_BASES)/deployments.plural.sh_tunnelclients.yaml

.PHONY: help
help: ## show help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Codegen

.PHONY: crds
crds: ## generate the TunnelClient CRD and copy it to the deployment operator
	cargo run --quiet --bin crdgen > $(TUNNEL_CLIENT_CRD).tmp
	mv $(TUNNEL_CLIENT_CRD).tmp $(TUNNEL_CLIENT_CRD)

##@ Build

.PHONY: build
build: ## build the ferrotunnel binaries
	cargo build --locked

.PHONY: test
test: ## run tests
	cargo test --locked
