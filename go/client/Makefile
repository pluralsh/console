ROOT_DIRECTORY := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))/../..

include $(ROOT_DIRECTORY)/go/paths.mk
include $(TOOLS_MAKEFILE)

##@ General

.PHONY: help
help: ## show help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

generate: install-gqlgenc ## generate Go client from GraphQL schema
	@$(GQLGENC)

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
