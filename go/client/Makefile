ROOT_DIRECTORY := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))/../..

include $(ROOT_DIRECTORY)/go/paths.mk
include $(WORKSPACES_DIR)/common.mk
include $(TOOLS_MAKEFILE)

.PHONY: generate
generate: TOOL = gqlgenc
generate: --tool ## generate Go client from GraphQL schema
	@$(GQLGENC)
	@go run cmd/main.go > generated/persisted-queries/queries.json

.PHONY: release
release: ## create and push a tag with new client version
	@LATEST_TAG=$$(git describe --tags `git rev-list --tags --max-count=1` --match="go/client/*" 2>/dev/null) ;\
	if [ $$? -ne 0 ]; then \
	  	echo Could not find latest tag ;\
	else \
  		echo Latest tag: $${LATEST_TAG} ;\
	fi ;\
	read -p "Version (without prefix): " tag ;\
	git checkout master ;\
	git pull --rebase ;\
	git tag -a go/client/$${tag} -m "release go/client/$${tag}" ;\
	git push origin go/client/$${tag}
