ROOT_DIRECTORY := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))/../..

include $(ROOT_DIRECTORY)/go/paths.mk
include $(WORKSPACES_DIR)/common.mk
include $(TOOLS_MAKEFILE)

.PHONY: build
build: ## compiles
	go build ./...

.PHONY: test
test: ## tests the codebase
	go test ./...

.PHONY: release
release: ## create and push a tag with new polly version
	@LATEST_TAG=$$(git describe --tags `git rev-list --tags --max-count=1` --match="go/polly/*" 2>/dev/null) ;\
	if [ $$? -ne 0 ]; then \
	  	echo Could not find latest tag ;\
	else \
  		echo Latest tag: $${LATEST_TAG} ;\
	fi ;\
	read -p "Version (without prefix): " tag ;\
	git checkout master ;\
	git pull --rebase ;\
	git tag -a go/polly/$${tag} -m "release go/polly/$${tag}" ;\
	git push origin go/polly/$${tag}

.PHONY: gen-docs
gen-docs: ## generates docs for registered liquid template functions
	go run github.com/pluralsh/console/go/polly/internal/template

##@ Docker Compose

.PHONY: up-docker
up-docker: ## build and run via docker compose
	docker compose -f docker-compose.yml up --build

.PHONY: test-docker
test-docker: ## run tests via docker compose
	@docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from polly-test; \
	status=$$?; \
	docker compose -f docker-compose.test.yml down; \
	exit $$status

.PHONY: build-docker
build-docker: ## build docker image via compose
	docker compose -f docker-compose.yml build
