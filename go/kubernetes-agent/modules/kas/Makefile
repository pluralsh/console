ROOT_DIRECTORY := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))/../..

# Global makefiles
include $(ROOT_DIRECTORY)/hack/include/config.mk
include $(TOOLS_MAKEFILE)

# Local makefiles
include build/include/config.mk
include build/include/deploy.mk

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

.PHONY: go-dep-updates
go-dep-updates: ## show possible Go dependency updates
	$(GO) list -u -f '{{if (and (not (or .Main .Indirect)) .Update)}}{{.Path}} {{.Version}} -> {{.Update.Version}}{{end}}' -m all

##@ Run

# Requires default kind cluster to run
.PHONY: run
run: --run-clean --run-prepare ## Run kas and agent with all dependencies using docker compose
	@AGENTK_TOKEN=${AGENTK_TOKEN} \
	docker compose -f $(DOCKER_COMPOSE_PATH) --project-name=$(APP_NAME) up -V --force-recreate

.PHONY: stop
stop: --run-clean ## Stop docker compose and clean up
	@AGENTK_TOKEN=${AGENTK_TOKEN} \
	docker compose -f $(DOCKER_COMPOSE_PATH) --project-name=$(APP_NAME) down --rmi local

# Requires default kind cluster to run
.PHONY: run-debug
run-debug: --run-clean --run-prepare ## Run kas and agent using docker compose in debug mode with Delve exposed on ports 40000 (kas) and 40001 (agent).
	@docker compose -f $(DOCKER_COMPOSE_DEBUG_PATH) --project-name=$(APP_NAME) up -V --force-recreate

.PHONY: stop-debug
stop-debug: --run-clean ## Stop docker compose and clean up debug containers
	@docker compose -f $(DOCKER_COMPOSE_DEBUG_PATH) --project-name=$(APP_NAME) down --rmi local

.PHONY: --run-prepare
--run-prepare: --certificate

.PHONY: --run-clean
--run-clean:
	@echo Cleaning up certs and secrets directory. This needs root permissions...
	@sudo rm -rf $(SECRET_DIRECTORY)
	@mkdir -p $(SECRET_DIRECTORY)

##@ Build

.PHONY: build
build: build-kas build-agentk ## build both kas and agentk

.PHONY: build-kas
build-kas: TARGET_DIRECTORY=$(KAS_DIST_DIR)/kas
build-kas: ## build kas
	@echo "[$(APP_NAME)] Building"
	@CGO_ENABLED=0 $(GO) build \
    	-gcflags='$(GCFLAGS)' \
		-ldflags '$(LDFLAGS)' \
		-o $(TARGET_DIRECTORY) ./cmd/kas

.PHONY: build-agentk
build-agentk: TARGET_DIRECTORY=$(KAS_DIST_DIR)/agentk
build-agentk: ## build agentk
	@echo "[$(APP_NAME)-agentk] Building"
	@CGO_ENABLED=0 $(GO) build \
    	-gcflags='$(GCFLAGS)' \
		-ldflags '$(LDFLAGS)' \
		-o $(TARGET_DIRECTORY) ./cmd/agentk

.PHONY: clean
clean:
	@echo "[$(APP_NAME)] Cleaning up"
	@rm -rf $(KAS_DIST_DIR)

##@ Docker

.PHONE: docker
docker: docker-kas docker-agentk ## build all Docker images

.PHONE: docker-debug
docker-debug: docker-kas-debug docker-agentk-debug ## build all Docker debug images with embedded Delve

.PHONY: docker-kas
docker-kas: APP_NAME=kas
docker-kas: DOCKERFILE=${DOCKER_DIRECTORY}/kas.Dockerfile
docker-kas: --image ## build Docker kas image

.PHONY: docker-kas-debug
docker-kas-debug: APP_NAME=kas
docker-kas-debug: DOCKERFILE=${DOCKER_DIRECTORY}/kas.debug.Dockerfile
docker-kas-debug: APP_VERSION=debug
docker-kas-debug: --image-debug ## build docker kas debug image with embedded Delve

.PHONY: docker-agentk
docker-agentk: APP_NAME=agentk
docker-agentk: DOCKERFILE=${DOCKER_DIRECTORY}/agentk.Dockerfile
docker-agentk: --image ## build docker agentk

.PHONY: docker-agentk-debug
docker-agentk-debug: APP_NAME=agentk
docker-agentk-debug: DOCKERFILE=${DOCKER_DIRECTORY}/agentk.debug.Dockerfile
docker-agentk-debug: APP_VERSION=debug
docker-agentk-debug: --image-debug ## build docker agentk debug image with embedded Delve

##@ Codegen

.PHONY: codegen
codegen: TOOL = mockgen
codegen: --tool codegen-delete --protoc --mocks ## regenerate protobuf and mocks

.PHONY: codegen-delete
codegen-delete: ## delete generated files
	@find . -name '*.pb.go' -type f -delete
	@find . -name '*.pb.validate.go' -type f -delete
	@find . \( -name '*_pb.rb' -and -not -name 'validate_pb.rb' \) -type f -delete
	@find . -name '*_proto_docs.md' -type f -delete
	@find . -empty -type d -delete

.PHONY: --protoc
--protoc: TOOL = protoc-gen-go protoc-gen-go-grpc protoc-gen-validate protoc-gen-doc
--protoc: --tool install-protoc
	@build/protoc.sh

.PHONY: --mocks
--mocks:
	@PATH="${PATH}:$(shell pwd)/build" go generate -x -v \
		"github.com/pluralsh/kubernetes-agent/cmd/agentk/agentkapp" \
		"github.com/pluralsh/kubernetes-agent/cmd/kas/kasapp" \
		"github.com/pluralsh/kubernetes-agent/pkg/module/modagent" \
		"github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel/tunnel" \
		"github.com/pluralsh/kubernetes-agent/pkg/tool/redistool" \
		"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_agent_registrar" \
		"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_agent_tracker" \
		"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_cache" \
		"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_k8s" \
		"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_kubernetes_api" \
		"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_modagent" \
		"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_modserver" \
		"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_modshared" \
		"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_redis" \
		"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_reverse_tunnel_rpc" \
		"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_reverse_tunnel_tunnel" \
		"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_rpc" \
		"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_stdlib" \
		"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_tool" \
		"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_usage_metrics"

##@ Tests

.PHONY: test
test: TOOL = gotestsum ## run tests
test: --tool
	$(GOTESTSUM) --format pkgname -- ./... -race -v -tags="cache"

.PHONY: check
check: TOOL = golangci-lint ## run linters
check: --tool
	@echo "[$(APP_NAME)] Running lint"
	@$(GOLANGCI_LINT) run -c $(GOLANGCI_LINT_CONFIG) ./...

.PHONY: fix
fix: TOOL = golangci-lint ## fix issues found by linters
fix: --tool
	@echo "[$(APP_NAME)] Running lint --fix"
	@$(GOLANGCI_LINT) run -c $(GOLANGCI_LINT_CONFIG) --fix ./...

##@ Release

delete-tag:  ## deletes a tag from git locally and upstream
	@read -p "Version: " tag; \
	git tag -d $$tag; \
	git push origin :$$tag

release-vsn: # tags and pushes a new release
	@read -p "Version: " tag; \
	git checkout master; \
	git pull --rebase; \
	git tag -a $$tag -m "new release"; \
	git push origin $$tag
