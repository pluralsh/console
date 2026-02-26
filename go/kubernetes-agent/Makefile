ROOT_DIRECTORY := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))/../..

include $(ROOT_DIRECTORY)/go/paths.mk
include $(TOOLS_MAKEFILE)

include $(KUBERNETES_AGENT_DIR)/config.mk
include $(KUBERNETES_AGENT_DIR)/kind.mk

.PHONY: help
help:
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":[^:]*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

# ============================ GLOBAL ============================ #
#
# A global list of targets executed for every module, it includes:
# - api
# - kas
#
# ================================================================ #

.PHONY: build
build: clean ## Builds all modules
	@$(MAKE) --no-print-directory -C $(API_DIR) build
	@$(MAKE) --no-print-directory -C $(KAS_DIR) build

.PHONY: check
check: clean ## Runs all available checks
	@$(MAKE) --no-print-directory -C $(API_DIR) check
	@$(MAKE) --no-print-directory -C $(KAS_DIR) check

.PHONY: clean
clean: --clean ## Clean up all temporary directories
	@$(MAKE) --no-print-directory -C $(API_DIR) clean
	@$(MAKE) --no-print-directory -C $(KAS_DIR) clean

.PHONY: fix
fix: clean ## Runs all available fix scripts
	@$(MAKE) --no-print-directory -C $(API_DIR) fix
	@$(MAKE) --no-print-directory -C $(KAS_DIR) fix

.PHONY: test
test: clean ## Runs all available test scripts
	@$(MAKE) --no-print-directory -C $(API_DIR) test
	@$(MAKE) --no-print-directory -C $(KAS_DIR) test

# ============================ Local ============================ #

.PHONY: schema
schema: clean
	@echo "[root] Regenerating schemas"
	@(cd $(API_DIR) && make --no-print-directory schema)
	@echo "[root] Schema regenerated successfully"

.PHONY: tools
tools: clean ## Installs required tools

# Starts development version of the application.
.PHONY: serve
serve: clean --ensure-kind-cluster --ensure-metrics-server ## Starts development version of the application
	@KUBECONFIG=$(KIND_CLUSTER_INTERNAL_KUBECONFIG_PATH) \
	VERSION="v0.0.0-dev" \
	docker compose -f $(DOCKER_COMPOSE_DEV_PATH) --project-name=$(PROJECT_NAME) up \
		--build \
		--force-recreate \
		--remove-orphans \
		--no-attach gateway \
		--no-attach scraper \
		--no-attach metrics-server

# Starts production version of the application.
.PHONY: run
run: clean --ensure-kind-cluster ## Starts production version of the application
	@KUBECONFIG=$(KIND_CLUSTER_INTERNAL_KUBECONFIG_PATH) \
	VERSION="v0.0.0-prod" \
	docker compose -f $(DOCKER_COMPOSE_PATH) --project-name=$(PROJECT_NAME) up \
		--build \
		--remove-orphans

.PHONY: run-debug
run-debug: clean --ensure-kind-cluster ## Starts production version of the application in debug mode
	@KUBECONFIG=$(KIND_CLUSTER_INTERNAL_KUBECONFIG_PATH) \
	VERSION="v0.0.0-prod" \
	docker compose -f $(DOCKER_COMPOSE_DEV_PATH) --project-name=$(PROJECT_NAME) up \
		--build \
		--remove-orphans

.PHONY: image
image:
ifndef NO_BUILD
	docker build \
      --build-arg VERSION=v0.0.0-prod \
      -f hack/docker/Dockerfile \
      -t kubernetes-agent:latest \
      .
endif

# Prepares and installs local dev version of Kubernetes Agent in our dedicated kind cluster.
#
# 1. Build all docker images
# 2. Load images into kind cluster
# 3. Run helm install using loaded dev images
#
# Run "NO_BUILD=true make helm" to skip building images.
#
# URL:
#	- https://localhost/ext/kas - proxied Kubernetes Agent 8180 endpoint via internal reverse proxy
#
# Note: Requires kind to set up and run.
# Note #2: Make sure that the port 443 (HTTPS) is free on your localhost.
.PHONY: helm
helm: --ensure-kind-cluster --ensure-kind-ingress-nginx image --kind-load-images ## Install Kubernetes Agent dev helm chart in the dev kind cluster
	@helm upgrade \
		--create-namespace \
		--namespace kas \
		--install kas \
		--set agent.token=$(AGENT_TOKEN) \
		hack/chart/kas

# ============================ Private ============================ #

.PHONY: --clean
--clean:
	@echo "[root] Cleaning up"
	@rm -rf $(TMP_DIR)
