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

.PHONY: release-vsn
release-vsn: ## tags and pushes a new release
	@read -p "Version: " tag; \
	git checkout main; \
	git pull --rebase; \
	git tag -a $$tag -m "new release"; \
	git push origin $$tag

.PHONY: gen-docs
gen-docs: ## generates docs for registered liquid template functions
	go run github.com/pluralsh/console/go/polly/internal/template
