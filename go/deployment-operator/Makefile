ROOT_DIRECTORY := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))/../..

include $(ROOT_DIRECTORY)/go/paths.mk
include $(WORKSPACES_DIR)/common.mk
include $(TOOLS_MAKEFILE)

PROJECT_NAME := deployment-operator

# Setting SHELL to bash allows bash commands to be executed by recipes.
# Options are set to exit when a recipe line exits non-zero or a piped command fails.
SHELL = /usr/bin/env bash -o pipefail
.SHELLFLAGS = -ec

# Config variables used for testing
DEFAULT_PLRL_CONSOLE_URL := "https://console.plrl-dev-aws.onplural.sh"
PLRL_CONSOLE_URL := $(if $(PLRL_CONSOLE_URL),$(PLRL_CONSOLE_URL),$(DEFAULT_PLRL_CONSOLE_URL))
PLRL_CONSOLE_TOKEN := $(if $(PLRL_CONSOLE_TOKEN),$(PLRL_CONSOLE_TOKEN),"")
PLRL_DEPLOY_TOKEN := $(if $(PLRL_DEPLOY_TOKEN),$(PLRL_DEPLOY_TOKEN),"")
PLRL_AGENT_RUN_ID := $(if $(PLRL_AGENT_RUN_ID),$(PLRL_AGENT_RUN_ID),"")
PLRL_OPENCODE_PROVIDER := $(if $(PLRL_OPENCODE_PROVIDER),$(PLRL_OPENCODE_PROVIDER),"")
PLRL_OPENCODE_ENDPOINT := $(if $(PLRL_OPENCODE_ENDPOINT),$(PLRL_OPENCODE_ENDPOINT),"")
PLRL_OPENCODE_MODEL := $(if $(PLRL_OPENCODE_MODEL),$(PLRL_OPENCODE_MODEL),"")
PLRL_OPENCODE_TOKEN := $(if $(PLRL_OPENCODE_TOKEN),$(PLRL_OPENCODE_TOKEN),"")
PLRL_CLAUDE_TOKEN := $(if $(PLRL_CLAUDE_TOKEN),$(PLRL_CLAUDE_TOKEN),"")
PLRL_CLAUDE_MODEL := $(if $(PLRL_CLAUDE_MODEL),$(PLRL_CLAUDE_MODEL),"")
PLRL_GEMINI_MODEL := $(if $(PLRL_GEMINI_MODEL),$(PLRL_GEMINI_MODEL),"")
PLRL_GEMINI_API_KEY := $(if $(PLRL_GEMINI_API_KEY),$(PLRL_GEMINI_API_KEY),"")
PLRL_CODEX_MODEL := $(if $(PLRL_CODEX_MODEL),$(PLRL_CODEX_MODEL),"")
PLRL_CODEX_API_KEY := $(if $(PLRL_CODEX_API_KEY),$(PLRL_CODEX_API_KEY),"")
PLRL_AGENT_PROVIDER := $(if $(PLRL_AGENT_PROVIDER),$(PLRL_AGENT_PROVIDER),opencode)
GIT_ACCESS_TOKEN := $(if $(GIT_ACCESS_TOKEN),$(GIT_ACCESS_TOKEN),"")

VELERO_CHART_VERSION := 5.2.2 # It should be kept in sync with Velero chart version from console/charts/velero
VELERO_CHART_URL := https://github.com/vmware-tanzu/helm-charts/releases/download/velero-$(VELERO_CHART_VERSION)/velero-$(VELERO_CHART_VERSION).tgz

ENVTEST_K8S_VERSION := 1.35.0
CONTROLLER_GEN_PATHS ?= ./api/...;./internal/...;./pkg/...

PRE = --ensure

##@ Development

.PHONY: manifests
manifests: TOOL = controller-gen
manifests: --tool ## Generate WebhookConfiguration, ClusterRole and CustomResourceDefinition objects.
	$(CONTROLLER_GEN) rbac:roleName=manager-role crd webhook paths="$(CONTROLLER_GEN_PATHS)" output:crd:artifacts:config=config/crd/bases
	@$(MAKE) -s codegen-chart-crds

.PHONY: generate
generate: TOOL = controller-gen
generate: --tool ## Generate code containing DeepCopy, DeepCopyInto, and DeepCopyObject method implementations.
	$(CONTROLLER_GEN) object:headerFile=$(BOILERPLATE_FILE) paths="$(CONTROLLER_GEN_PATHS)"

.PHONY: genmock
genmock: TOOL = mockery
genmock: --tool ## generates mocks before running tests
	$(MOCKERY)

.PHONY: codegen-chart-crds
codegen-chart-crds: ## copy CRDs to the helm chart
	@cp -a ./config/crd/bases/. ../../charts/deployment-operator/crds

.PHONY: velero-crds
velero-crds: ## download velero CRDs
	@curl -L $(VELERO_CHART_URL) --output velero.tgz
	@tar zxvf velero.tgz velero/crds
	@mv velero/crds/* charts/deployment-operator/crds
	@rm -r velero.tgz velero

.PHONY: crd-docs
crd-docs: TOOL = crd-ref-docs
crd-docs: --tool ##generate docs from the CRDs
	$(CRDDOCS) --source-path=./api --renderer=markdown --output-path=./docs/api.md --config=$(CRD_REF_DOCS_CONFIG)

.PHONY: scm-grpc
scm-grpc: TOOL = protoc-gen-go protoc-gen-go-grpc
scm-grpc: --tool install-protoc ## regenerate SCM gRPC protobuf/go bindings
	rm -f internal/proto/scm/*.pb.go
	$(PROTOC) \
		--plugin=protoc-gen-go=$(BINARIES_DIR)/protoc-gen-go \
		--plugin=protoc-gen-go-grpc=$(BINARIES_DIR)/protoc-gen-go-grpc \
		--go_out=. \
		--go_opt=module=github.com/pluralsh/console/go/deployment-operator \
		--go-grpc_out=. \
		--go-grpc_opt=module=github.com/pluralsh/console/go/deployment-operator \
		--proto_path=. \
		internal/proto/scm/scm.proto

##@ Run

.PHONY: agent-run
agent-run: agent ## run agent
	OPERATOR_NAMESPACE=plrl-deploy-operator \
	go run cmd/agent/*.go \
		--console-url=${PLURAL_CONSOLE_URL}/ext/gql \
        --enable-helm-dependency-update=false \
        --disable-helm-dry-run-server=false \
        --cluster-id=${PLURAL_CLUSTER_ID} \
        --local \
        --refresh-interval=30s \
        --resource-cache-ttl=60s \
        --max-concurrent-reconciles=20 \
        --v=1 \
        --deploy-token=${PLURAL_DEPLOY_TOKEN}

.PHONY: harness-run-terraform
harness-run-terraform: docker-build-harness-terraform ## run harness
	@KUBECONFIG_TMP=$$(mktemp) && \
	cp $${KUBECONFIG:-$${HOME}/.kube/config} $$KUBECONFIG_TMP && \
	chmod 644 $$KUBECONFIG_TMP && \
	docker run --rm \
		--network=host \
		-v $$KUBECONFIG_TMP:/home/nonroot/.kube/config \
		-e KUBECONFIG=/home/nonroot/.kube/config \
		-e HOME=/home/nonroot \
		harness:latest \
		--v=5 \
		--console-url=${PLURAL_CONSOLE_URL}/ext/gql \
		--console-token=${PLURAL_DEPLOY_TOKEN} \
		--stack-run-id=${PLURAL_STACK_RUN_ID}; \
	rm -f $$KUBECONFIG_TMP

.PHONY: harness-run-ansible
harness-run-ansible: docker-build-harness-ansible ## run harness
	@KUBECONFIG_TMP=$$(mktemp) && \
	cp $${KUBECONFIG:-$${HOME}/.kube/config} $$KUBECONFIG_TMP && \
	chmod 644 $$KUBECONFIG_TMP && \
	docker run --rm \
		--network=host \
		-v $$KUBECONFIG_TMP:/home/nonroot/.kube/config \
		-e KUBECONFIG=/home/nonroot/.kube/config \
		-e HOME=/home/nonroot \
		harness:latest \
		--v=5 \
		--console-url=${PLURAL_CONSOLE_URL}/ext/gql \
		--console-token=${PLURAL_DEPLOY_TOKEN} \
		--stack-run-id=${PLURAL_STACK_RUN_ID}; \
	rm -f $$KUBECONFIG_TMP

.PHONY: agent-harness-opencode-run
agent-harness-opencode-run: docker-build-agent-harness-opencode ## run agent harness w/ opencode
	docker run \
		-e PLRL_AGENT_RUN_ID=$(PLRL_AGENT_RUN_ID) \
		-e PLRL_DEPLOY_TOKEN=$(PLRL_DEPLOY_TOKEN) \
		-e PLRL_CONSOLE_URL=$(PLRL_CONSOLE_URL) \
		-e PLRL_OPENCODE_PROVIDER=$(PLRL_OPENCODE_PROVIDER) \
		-e PLRL_OPENCODE_ENDPOINT=$(PLRL_OPENCODE_ENDPOINT) \
		-e PLRL_OPENCODE_MODEL=$(PLRL_OPENCODE_MODEL) \
		-e PLRL_OPENCODE_TOKEN=$(PLRL_OPENCODE_TOKEN) \
		--rm -it \
		ghcr.io/pluralsh/agent-harness-opencode --v=4

.PHONY: agent-harness-codex-run
agent-harness-codex-run: docker-build-agent-harness-codex ## run agent harness w/ codex
	@KEY_TMP=$$(mktemp) && \
	cp $${HOME}/.ssh/id_rsa $$KEY_TMP && \
	chmod 644 $$KEY_TMP && \
	docker run \
		-v $$KEY_TMP:/plural/git/git-signing.key:ro \
		-e PLRL_AGENT_RUN_ID=$(PLRL_AGENT_RUN_ID) \
		-e PLRL_DEPLOY_TOKEN=$(PLRL_DEPLOY_TOKEN) \
		-e PLRL_CONSOLE_URL=$(PLRL_CONSOLE_URL) \
		-e PLRL_CODEX_MODEL=$(PLRL_CODEX_MODEL) \
		-e PLRL_CODEX_API_KEY=$(PLRL_CODEX_API_KEY) \
		-e GIT_ACCESS_TOKEN=$(GIT_ACCESS_TOKEN) \
		--rm -it \
		ghcr.io/pluralsh/agent-harness-codex --v=3; \
	rm -f $$KEY_TMP

.PHONY: agent-harness-claude-run
agent-harness-claude-run: docker-build-agent-harness-claude ## run agent harness w/ claude
	docker run \
		-e PLRL_AGENT_RUN_ID=$(PLRL_AGENT_RUN_ID) \
		-e PLRL_DEPLOY_TOKEN=$(PLRL_DEPLOY_TOKEN) \
		-e PLRL_CONSOLE_URL=$(PLRL_CONSOLE_URL) \
		-e PLRL_CLAUDE_MODEL=$(PLRL_CLAUDE_MODEL) \
		-e PLRL_CLAUDE_TOKEN=$(PLRL_CLAUDE_TOKEN) \
		--rm -it \
		ghcr.io/pluralsh/agent-harness-claude --v=3

.PHONY: agent-harness-gemini-run
agent-harness-gemini-run: docker-build-agent-harness-gemini ## run agent harness w/ gemini
	docker run \
		-e PLRL_AGENT_RUN_ID=$(PLRL_AGENT_RUN_ID) \
		-e PLRL_DEPLOY_TOKEN=$(PLRL_DEPLOY_TOKEN) \
		-e PLRL_CONSOLE_URL=$(PLRL_CONSOLE_URL) \
		-e PLRL_GEMINI_MODEL=$(PLRL_GEMINI_MODEL) \
		-e PLRL_GEMINI_API_KEY=$(PLRL_GEMINI_API_KEY) \
		--rm -it \
		ghcr.io/pluralsh/agent-harness-gemini --v=5

.PHONY: agent-mcpserver-run
agent-mcpserver-run: agent-mcpserver ## run mcp server locally
	PLRL_CONSOLE_TOKEN=${PLRL_CONSOLE_TOKEN} \
	PLRL_CONSOLE_URL=${PLRL_CONSOLE_URL} \
	PLRL_AGENT_RUN_ID=${PLRL_AGENT_RUN_ID} \
	./bin/agent-mcpserver

.PHONY: agent-up
agent-up: agent-base-build ## run bootstrap + harness + mcpserver via docker compose
	@cd dockerfiles/mcpserver/agent && \
		PLRL_AGENT_PROVIDER=$(PLRL_AGENT_PROVIDER) docker compose up --no-build --force-recreate -d && \
		HARNESS_ID=$$(docker compose ps -q harness) && \
		if [ -z "$$HARNESS_ID" ]; then \
			echo "harness container was not created"; \
			docker compose stop; \
			exit 1; \
		fi; \
		CODE=$$(docker wait $$HARNESS_ID); \
		STATUS=$$?; \
		docker compose stop; \
		if [ $$STATUS -ne 0 ]; then \
			exit $$STATUS; \
		fi; \
		exit $$CODE

.PHONY: agent-up-opencode
agent-up-opencode: ## run local agent pod simulation with opencode harness image
	@$(MAKE) agent-up PLRL_AGENT_PROVIDER=opencode

.PHONY: agent-up-codex
agent-up-codex: ## run local agent pod simulation with codex harness image
	@$(MAKE) agent-up PLRL_AGENT_PROVIDER=codex

.PHONY: agent-up-claude
agent-up-claude: ## run local agent pod simulation with claude harness image
	@$(MAKE) agent-up PLRL_AGENT_PROVIDER=claude

.PHONY: agent-up-gemini
agent-up-gemini: ## run local agent pod simulation with gemini harness image
	@$(MAKE) agent-up PLRL_AGENT_PROVIDER=gemini

.PHONY: agent-base-build
agent-base-build: agent-clean ## build base agent image
	@cd dockerfiles/mcpserver/agent && \
    PLRL_AGENT_PROVIDER=$(PLRL_AGENT_PROVIDER) docker compose build shared-permissions && \
    PLRL_AGENT_PROVIDER=$(PLRL_AGENT_PROVIDER) docker compose build harness

.PHONY: agent-down
agent-down: ## stop local agent pod simulation (keeps containers and logs)
	cd dockerfiles/mcpserver/agent && docker compose stop

.PHONY: agent-clean
agent-clean: ## remove local agent pod simulation containers, networks and volumes
	cd dockerfiles/mcpserver/agent && docker compose down -v

.PHONY: terraform-mcpserver-run
terraform-mcpserver-run: terraform-mcpserver ## run mcp server locally
	PLURAL_ACCESS_TOKEN=${PLURAL_ACCESS_TOKEN} \
	PLURAL_CONSOLE_URL=${PLURAL_CONSOLE_URL} \
	./bin/terraform-mcpserver

.PHONY: sentinel-run
sentinel-run: docker-build-sentinel-harness
	@KUBECONFIG_TMP=$$(mktemp) && \
	cp ${HOME}/.kube/config $$KUBECONFIG_TMP && \
	chmod 644 $$KUBECONFIG_TMP && \
	docker run --rm \
		--network=host \
		-v $$KUBECONFIG_TMP:/home/nonroot/.kube/config \
		-e KUBECONFIG=/home/nonroot/.kube/config \
		ghcr.io/pluralsh/sentinel-harness:local \
		--console-url=${PLRL_CONSOLE_URL}/ext/gql \
		--console-token=${PLRL_DEPLOY_TOKEN} \
		--sentinel-run-id=${SENTINEL_RUN_ID} \
		--test-dir=/workspace/deployment-operator \
		--output-dir=/plural \
		--v=3; \
	rm -f $$KUBECONFIG_TMP

##@ Build

.PHONY: build
build: agent harness agent-harness sentinel-harness ## build all binaries

.PHONY: agent
agent: ## build agent
	go build -o bin/deployment-agent cmd/agent/*.go

.PHONY: harness
harness: ## build stack run harness
	go build -o bin/stack-run-harness cmd/harness/main.go

.PHONY: agent-harness
agent-harness: ## build agent harness
	go build -o bin/agent-harness cmd/agent-harness/*.go

.PHONY: sentinel-harness
sentinel-harness: ## build sentinel harness
	go build -o bin/sentinel-harness cmd/sentinel-harness/*.go

.PHONY: agent-mcpserver
agent-mcpserver: ## build agent harness mcp server
	go build -o bin/agent-mcpserver cmd/mcpserver/agent/main.go

.PHONY: terraform-mcpserver
terraform-mcpserver: ## build terraform mcp server
	go build -o bin/terraform-mcpserver cmd/mcpserver/terraform-server/main.go

##@ Docker

.PHONY: docker-build-harness-base
docker-build-harness-base: ## build base docker harness image
	docker build \
			--build-arg=VERSION="0.0.0-dev" \
    	  	-t harness-base \
    		-f $(WORKSPACES_DIR)/deployment-operator/dockerfiles/harness/base.Dockerfile \
    		$(WORKSPACES_DIR)

.PHONY: docker-build-harness-terraform
docker-build-harness-terraform: docker-build-harness-base ## build terraform docker harness image
	docker build \
		  	--build-arg=HARNESS_IMAGE_TAG="latest" \
    	  	-t harness \
    		-f $(WORKSPACES_DIR)/deployment-operator/dockerfiles/harness/terraform.Dockerfile \
    		$(WORKSPACES_DIR)

.PHONY: docker-build-harness-ansible
docker-build-harness-ansible: docker-build-harness-base ## build terraform docker harness image
	docker build \
		  	--build-arg=HARNESS_IMAGE_TAG="latest" \
    	  	-t harness \
    		-f $(WORKSPACES_DIR)/deployment-operator/dockerfiles/harness/ansible.Dockerfile \
    		$(WORKSPACES_DIR)

.PHONY: docker-build-agent-harness-base
docker-build-agent-harness-base: ## build base docker agent harness image
	docker build \
		--build-arg=VERSION="0.0.0-dev" \
		-t ghcr.io/pluralsh/agent-harness-base \
		-f $(WORKSPACES_DIR)/deployment-operator/dockerfiles/agent-harness/base.Dockerfile \
		$(WORKSPACES_DIR)

.PHONY: docker-build-agent-harness-gemini
docker-build-agent-harness-gemini: docker-build-agent-harness-base ## build gemini docker agent harness image
	docker build \
		--build-arg=AGENT_HARNESS_BASE_IMAGE_TAG="latest" \
		-t ghcr.io/pluralsh/agent-harness-gemini \
		-f $(WORKSPACES_DIR)/deployment-operator/dockerfiles/agent-harness/gemini.Dockerfile \
		$(WORKSPACES_DIR)

.PHONY: docker-build-agent-harness-claude
docker-build-agent-harness-claude: docker-build-agent-harness-base ## build claude docker agent harness image
	docker build \
		--build-arg=AGENT_HARNESS_BASE_IMAGE_TAG="latest" \
		-t ghcr.io/pluralsh/agent-harness-claude \
		-f $(WORKSPACES_DIR)/deployment-operator/dockerfiles/agent-harness/claude.Dockerfile \
		$(WORKSPACES_DIR)

.PHONY: docker-build-agent-harness-codex
docker-build-agent-harness-codex: docker-build-agent-harness-base ## build codex docker agent harness image
	docker build --no-cache \
		--build-arg=AGENT_HARNESS_BASE_IMAGE_TAG="latest" \
		-t ghcr.io/pluralsh/agent-harness-codex \
		-f $(WORKSPACES_DIR)/deployment-operator/dockerfiles/agent-harness/codex.Dockerfile \
		$(WORKSPACES_DIR)

.PHONY: docker-build-agent-harness-opencode
docker-build-agent-harness-opencode: docker-build-agent-harness-base ## build opencode docker agent harness image
	docker build \
		--build-arg=AGENT_HARNESS_BASE_IMAGE_TAG="latest" \
		-t ghcr.io/pluralsh/agent-harness-opencode \
		-f $(WORKSPACES_DIR)/deployment-operator/dockerfiles/agent-harness/opencode.Dockerfile \
		$(WORKSPACES_DIR)

.PHONY: docker-build-terraform-mcpserver
docker-build-terraform-mcpserver: ## build mcp server docker image
	docker build \
		--build-arg=VERSION="0.0.0-dev" \
		-t ghcr.io/pluralsh/terraform-mcpserver:latest \
		-f $(WORKSPACES_DIR)/deployment-operator/dockerfiles/mcpserver/terraform-server/Dockerfile \
		$(WORKSPACES_DIR)

.PHONY: docker-build-sentinel-harness-base
docker-build-sentinel-harness-base: ## build base docker sentinel harness image
	docker build \
		--build-arg=VERSION="0.0.0-dev" \
		-t ghcr.io/pluralsh/sentinel-harness-base:local \
		-f $(WORKSPACES_DIR)/deployment-operator/dockerfiles/sentinel-harness/base.Dockerfile \
		$(WORKSPACES_DIR)

.PHONY: docker-build-sentinel-harness
docker-build-sentinel-harness: docker-build-sentinel-harness-base ## build docker sentinel harness image
	docker build \
		--build-arg=SENTINEL_HARNESS_BASE_IMAGE_TAG="local" \
		-t ghcr.io/pluralsh/sentinel-harness:local \
		-f $(WORKSPACES_DIR)/deployment-operator/dockerfiles/sentinel-harness/terratest.Dockerfile \
		$(WORKSPACES_DIR)

##@ Tests
.PHONY: test
test: TOOL = envtest gotestsum
test: --tool ## run tests
	@KUBEBUILDER_ASSETS="$(shell $(ENVTEST) use $(ENVTEST_K8S_VERSION) --bin-dir $(BINARIES_DIR) -p path)" \
	$(GOTESTSUM) --format pkgname -- \
		$$(go list ./... | grep -v /e2e) \
		-race -v -tags="cache"

.PHONY: test-docker
test-docker: ## run tests via docker compose
	@docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from deployment-operator-test; \
	status=$$?; \
	docker compose -f docker-compose.test.yml down; \
	exit $$status

##@ Docker Compose

.PHONY: up
up: ## spin up deployment-operator with kind cluster
	docker compose up --build

.PHONY: down
down: ## stop deployment-operator and kind cluster
	docker compose down --remove-orphans
	kind delete cluster --name $${KIND_CLUSTER_NAME:-deployment-operator}

.PHONY: logs
logs: ## show logs from deployment-operator
	docker compose logs -f agent
