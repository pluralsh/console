ROOT_DIRECTORY := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))/../..

include $(ROOT_DIRECTORY)/go/paths.mk
include $(WORKSPACES_DIR)/common.mk
include $(TOOLS_MAKEFILE)

.PHONY: test
test: TOOL = ginkgo
test: --tool
	@$(GINKGO) -r --race --randomize-all --randomize-suites -v
