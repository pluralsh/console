ROOT_DIRECTORY := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))/../..

include $(ROOT_DIRECTORY)/go/paths.mk
include $(WORKSPACES_DIR)/common.mk
include $(TOOLS_MAKEFILE)

##@ Docker Compose

.PHONY: up-docker
up-docker: ## build and run via docker compose
	docker compose -f docker-compose.yml up --build

.PHONY: test-docker
test-docker: ## run tests via docker compose
	@docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from sign-test; \
	status=$$?; \
	docker compose -f docker-compose.test.yml down; \
	exit $$status

.PHONY: build-docker
build-docker: ## build docker image via compose
	docker compose -f docker-compose.yml build
