ROOT_DIRECTORY := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))/../..

CRD_BASES := $(ROOT_DIRECTORY)/go/deployment-operator/config/crd/bases
CHART_CRDS := $(ROOT_DIRECTORY)/charts/ferrotunnel/crds
TUNNEL_CLIENT_CRD := deployments.plural.sh_tunnelclients.yaml

IMAGE ?= ghcr.io/pluralsh/ferrotunnel-client
VERSION ?= $(shell git describe --tags --always --dirty)

.PHONY: help
help: ## show help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Codegen

.PHONY: crds
crds: ## generate the TunnelClient CRD and copy it to the operator and chart
	mkdir -p $(CRD_BASES) $(CHART_CRDS)
	cargo run --quiet --bin crdgen > $(CRD_BASES)/$(TUNNEL_CLIENT_CRD).tmp
	mv $(CRD_BASES)/$(TUNNEL_CLIENT_CRD).tmp $(CRD_BASES)/$(TUNNEL_CLIENT_CRD)
	cp $(CRD_BASES)/$(TUNNEL_CLIENT_CRD) $(CHART_CRDS)/$(TUNNEL_CLIENT_CRD)

##@ Build

.PHONY: build
build: ## build the ferrotunnel binaries
	cargo build --locked

.PHONY: test
test: ## run tests
	cargo test --locked

##@ Docker

.PHONY: docker-build
docker-build: ## build the controller image
	docker build -t $(IMAGE):$(VERSION) .

##@ Local

LOCAL_DIR := .local
TOKEN_FILE := $(LOCAL_DIR)/token
SERVER_IMAGE ?= ghcr.io/ferro-labs/ferrotunnel:v1.5.2

.PHONY: server
server: ## start a local FerroTunnel server on 127.0.0.1:7835
	mkdir -p $(LOCAL_DIR)
	@if [ ! -f $(TOKEN_FILE) ]; then openssl rand -hex 24 > $(TOKEN_FILE); fi
	docker run --rm --name ferrotunnel-server \
		-p 127.0.0.1:7835:7835 \
		-p 127.0.0.1:8080:8080 \
		-e FERROTUNNEL_TOKEN="$$(tr -d '\n' < $(TOKEN_FILE))" \
		$(SERVER_IMAGE) server --bind 0.0.0.0:7835 --http-bind 0.0.0.0:8080
