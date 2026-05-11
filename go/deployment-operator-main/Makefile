ROOT_DIRECTORY := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

PROJECT_NAME := deployment-operator

IMAGE_REGISTRIES := ghcr.io
IMAGE_REPOSITORY := plural

ENVTEST ?= $(shell which setup-envtest)
CRDDOCS ?= $(shell which crd-ref-docs)

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
GIT_ACCESS_TOKEN := $(if $(GIT_ACCESS_TOKEN),$(GIT_ACCESS_TOKEN),"")


VELERO_CHART_VERSION := 5.2.2 # It should be kept in sync with Velero chart version from console/charts/velero
VELERO_CHART_URL := https://github.com/vmware-tanzu/helm-charts/releases/download/velero-$(VELERO_CHART_VERSION)/velero-$(VELERO_CHART_VERSION).tgz

## Location to install dependencies to
LOCALBIN ?= $(shell pwd)/bin
$(LOCALBIN):
	mkdir -p $(LOCALBIN)

ENVTEST_K8S_VERSION := 1.28.3
CONTROLLER_GEN ?= $(shell which controller-gen)
MOCKERY ?= $(shell which mockery)
include tools.mk

ifndef GOPATH
GOPATH := $(shell go env GOPATH)
endif

PRE = --ensure

##@ General

.PHONY: help
help: ## Display this help.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

.PHONY: crd-docs
crd-docs: tools ##generate docs from the CRDs
	$(CRDDOCS) --source-path=./api --renderer=markdown --output-path=./docs/api.md --config=config.yaml

##@ Development

.PHONY: manifests
manifests: controller-gen ## Generate WebhookConfiguration, ClusterRole and CustomResourceDefinition objects.
	$(CONTROLLER_GEN) rbac:roleName=manager-role crd webhook paths="./..." output:crd:artifacts:config=config/crd/bases
	@$(MAKE) -s codegen-chart-crds

.PHONY: generate
generate: controller-gen ## Generate code containing DeepCopy, DeepCopyInto, and DeepCopyObject method implementations.
	$(CONTROLLER_GEN) object:headerFile="hack/boilerplate.go.txt" paths="./..."

.PHONY: genmock
genmock: mockery ## generates mocks before running tests
	$(MOCKERY)

.PHONY: codegen-chart-crds
codegen-chart-crds: ## copy CRDs to the helm chart
	@cp -a config/crd/bases/. charts/deployment-operator/crds

.PHONY: velero-crds
velero-crds: ## download velero CRDs
	@curl -L $(VELERO_CHART_URL) --output velero.tgz
	@tar zxvf velero.tgz velero/crds
	@mv velero/crds/* charts/deployment-operator/crds
	@rm -r velero.tgz velero

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
		--test-dir=/sentinel \
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

.PHONY: docker-build-sentinel-harness-base
docker-build-sentinel-harness-base: ## build base docker sentinel harness image
	docker build \
		--build-arg=VERSION="0.0.0-dev" \
		-t ghcr.io/pluralsh/sentinel-harness-base:local \
		-f dockerfiles/sentinel-harness/base.Dockerfile \
		.

.PHONY: docker-build-sentinel-harness
docker-build-sentinel-harness: docker-build-sentinel-harness-base ## build docker sentinel harness image
	docker build \
		--build-arg=SENTINEL_HARNESS_BASE_IMAGE_TAG="local" \
		-t ghcr.io/pluralsh/sentinel-harness:local \
		-f dockerfiles/sentinel-harness/terratest.Dockerfile \
		.

.PHONY: agent-mcpserver
agent-mcpserver: ## build agent harness mcp server
	go build -o bin/agent-mcpserver cmd/mcpserver/agent/main.go


.PHONY: terraform-mcpserver
terraform-mcpserver: ## build terraform mcp server
	go build -o bin/terraform-mcpserver cmd/mcpserver/terraform-server/main.go

##@ Docker

.PHONY: docker-build-agent-fips
docker-build-agent-fips: ## build docker fips agent image
	docker build \
    	  	-t deployment-agent-fips \
    		-f dockerfiles/agent/fips.Dockerfile \
    		.

.PHONY: docker-build-harness-base
docker-build-harness-base: ## build base docker harness image
	docker build \
			--build-arg=VERSION="0.0.0-dev" \
    	  	-t harness-base \
    		-f dockerfiles/harness/base.Dockerfile \
    		.

.PHONY: docker-build-harness-terraform
docker-build-harness-terraform: docker-build-harness-base ## build terraform docker harness image
	docker build \
		  	--build-arg=HARNESS_IMAGE_TAG="latest" \
    	  	-t harness \
    		-f dockerfiles/harness/terraform.Dockerfile \
    		.

.PHONY: docker-build-harness-ansible
docker-build-harness-ansible: docker-build-harness-base ## build terraform docker harness image
	docker build \
		  	--build-arg=HARNESS_IMAGE_TAG="latest" \
    	  	-t harness \
    		-f dockerfiles/harness/ansible.Dockerfile \
    		.

.PHONY: docker-build-harness-base-fips
docker-build-harness-base-fips: ## build fips base docker harness image
	docker build \
			--no-cache \
			--build-arg=VERSION="0.0.0-dev" \
    	  	-t harness-base-fips \
    		-f dockerfiles/harness/base.fips.Dockerfile \
    		.

.PHONY: docker-build-harness-ansible-fips
docker-build-harness-ansible-fips: docker-build-harness-base-fips ## build fips ansible docker harness image
	docker build \
			--no-cache \
		  	--build-arg=HARNESS_IMAGE_TAG="latest" \
    	  	-t harness-fips \
    		-f dockerfiles/harness/ansible.fips.Dockerfile \
    		.

.PHONY: docker-build-agent-harness-base
docker-build-agent-harness-base: ## build base docker agent harness image
	docker build \
		--build-arg=VERSION="0.0.0-dev" \
		-t ghcr.io/pluralsh/agent-harness-base \
		-f dockerfiles/agent-harness/base.Dockerfile \
		.

.PHONY: docker-build-agent-harness-gemini
docker-build-agent-harness-gemini: docker-build-agent-harness-base ## build gemini docker agent harness image
	docker build \
		--build-arg=AGENT_HARNESS_BASE_IMAGE_TAG="latest" \
		-t ghcr.io/pluralsh/agent-harness-gemini \
		-f dockerfiles/agent-harness/gemini.Dockerfile \
		.

.PHONY: docker-build-agent-harness-claude
docker-build-agent-harness-claude: docker-build-agent-harness-base ## build claude docker agent harness image
	docker build \
		--build-arg=AGENT_HARNESS_BASE_IMAGE_TAG="latest" \
		-t ghcr.io/pluralsh/agent-harness-claude \
		-f dockerfiles/agent-harness/claude.Dockerfile \
		.

.PHONY: docker-build-agent-harness-codex
docker-build-agent-harness-codex: docker-build-agent-harness-base ## build codex docker agent harness image
	docker build --no-cache \
		--build-arg=AGENT_HARNESS_BASE_IMAGE_TAG="latest" \
		-t ghcr.io/pluralsh/agent-harness-codex \
		-f dockerfiles/agent-harness/codex.Dockerfile \
		.

.PHONY: docker-build-agent-harness-opencode
docker-build-agent-harness-opencode: docker-build-agent-harness-base ## build opencode docker agent harness image
	docker build \
		--build-arg=AGENT_HARNESS_BASE_IMAGE_TAG="latest" \
		-t ghcr.io/pluralsh/agent-harness-opencode \
		-f dockerfiles/agent-harness/opencode.Dockerfile \
		.

.PHONY: docker-build-terraform-mcpserver
docker-build-terraform-mcpserver: ## build mcp server docker image
	docker build \
		--build-arg=VERSION="0.0.0-dev" \
		-t ghcr.io/pluralsh/terraform-mcpserver:latest \
		-f dockerfiles/mcpserver/terraform-server/Dockerfile \
		.

##@ Tests
.PHONY: test
test: tools ## run tests
	@KUBEBUILDER_ASSETS="$(shell $(ENVTEST) use $(ENVTEST_K8S_VERSION) --bin-dir $(GOPATH)/bin -p path)" \
	gotestsum --format pkgname -- \
		$$(go list ./... | grep -v /e2e) \
		-race -v -tags="cache"

.PHONY: test-docker
test-docker: ## run tests in docker compose
	@set +e; \
	docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from tests; \
	status=$$?; \
	docker compose -f docker-compose.test.yml down --remove-orphans; \
	exit $$status

.PHONY: lint
lint: $(PRE) ## run linters
	golangci-lint run ./...

.PHONY: fix
fix: $(PRE) ## fix issues found by linters
	golangci-lint run --fix ./...

##@ Release

release-vsn: ## tags and pushes a new release
	@read -p "Version: " tag; \
	git checkout main; \
	git pull --rebase; \
	git tag -a $$tag -m "new release"; \
	git push origin $$tag

delete-tag:  ## deletes a tag from git locally and upstream
	@read -p "Version: " tag; \
	git tag -d $$tag; \
	git push origin :$$tag

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

##@ Dependencies

.PHONY: tools
tools: ## install required tools
tools: --tool

.PHONY: --tool
%--tool: TOOL = .*
--tool: # INTERNAL: installs tool with name provided via $(TOOL) variable or all tools.
	@cat tools.go | grep _ | awk -F'"' '$$2 ~ /$(TOOL)/ {print $$2}' | xargs -I {} go install {}

.PHONY: envtest
envtest: TOOL = setup-envtest
envtest: --tool ## download and install setup-envtest in the $GOPATH/bin

.PHONY: mockery
mockery: TOOL = mockery
mockery: --tool

.PHONY: crd-ref-docs
crd-ref-docs: TOOL = crd-ref-docs
crd-ref-docs: --tool

.PHONY: controller-gen
controller-gen: TOOL = controller-gen
controller-gen: --tool

.PHONY: discovery
discovery: TOOL = discovery
discovery: --tool

.PHONY: gotestsum
gotestsum: TOOL = gotestsum
gotestsum: --tool

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
