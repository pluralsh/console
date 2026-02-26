ROOT_DIRECTORY = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))/../..

# Global makefile partial config
include $(ROOT_DIRECTORY)/hack/include/config.mk
include $(ROOT_DIRECTORY)/hack/include/kind.mk
include $(TOOLS_MAKEFILE)

# Local makefile partial config
include hack/include/config.mk

# ==================== GLOBAL ==================== #

.PHONY: build
build:
	@echo "[$(APP_NAME)] Building"
	@CGO_ENABLED=0 $(GO) build -trimpath -ldflags "-s -w" -o $(API_DIST_DIR)/$(APP_NAME) .

.PHONY: check
check: check-go

.PHONY: clean
clean:
	@echo "[$(APP_NAME)] Cleaning up"
	@rm -rf $(API_DIST_DIR)

.PHONY: coverage
coverage: DIR := $(TMP_DIR)
coverage: --ensure-dir
	@echo "[$(APP_NAME)] Running tests with coverage"
	@$(GO) test -coverprofile=$(COVERAGE_FILE) -covermode=atomic $(PACKAGE_NAME)/...

.PHONY: fix
fix: fix-go

.PHONY: test
test: TOOL = gotestsum
test: --tool ## run tests
	@echo "[$(APP_NAME)] Running tests"
	@$(GOTESTSUM) --format pkgname -- ./... -race -v

# ==================== LOCAL ==================== #

.PHONY: check-go
check-go: TOOL = golangci-lint ## run linters
check-go: --tool
	@echo "[$(APP_NAME)] Running lint"
	@$(GOLANGCI_LINT) run -c $(GOLANGCI_LINT_CONFIG) ./...

.PHONY: codegen-update
codegen-update: --codegen-update-run --codegen-update-post

.PHONY: codegen-verify
codegen-verify: VERIFY_ONLY = true
codegen-verify: --codegen-verify-pre --codegen-update-run --codegen-verify-post

.PHONY: fix-go
fix-go: TOOL = golangci-lint ## fix issues found by linters
fix-go: --tool
	@echo "[$(APP_NAME)] Running lint --fix"
	@$(GOLANGCI_LINT) run -c $(GOLANGCI_LINT_CONFIG) --fix ./...

.PHONY: run
run: build
	@$(API_DIST_BINARY) \
		--kubeconfig=$(KUBECONFIG) \
		--metrics-provider=none

.PHONY: schema
schema: install-graphql-mesh --ensure-kind-cluster build --swagger --graphql-mesh

# ==================== PRIVATE ==================== #

.PHONY: --codegen-update-run
--codegen-update-run:
	@${GOPATH}/bin/client-gen \
		--go-header-file=$(TOOLS_DIR)/boilerplate.go.txt \
  	--input-base=$(INPUT_BASE) \
  	--input=$(INPUT) \
  	--clientset-name=$(CLIENTSET_NAME) \
  	--output-base=$(OUTPUT_BASE) \
  	--output-package=$(OUTPUT_PACKAGE) \
  	--verify-only=$(VERIFY_ONLY) \
  	$(CODEGEN_EXTRA_ARGS)

.PHONY: --codegen-update-post
--codegen-update-post:
	@rm -rf $(BASE_DIR)/client
	@mv $(BASE_DIR)/$(OUTPUT_PACKAGE) $(BASE_DIR)
	@rm -rf $(BASE_DIR)/k8s.io

.PHONY: --codegen-verify-pre
--codegen-verify-pre:
	@mkdir -p $(BASE_DIR)/$(OUTPUT_PACKAGE)
	@cp -r $(BASE_DIR)/client $(BASE_DIR)/$(INPUT_BASE)

.PHONY: --codegen-verify-post
--codegen-verify-post:
	@rm -rf $(BASE_DIR)/k8s.io

.PHONY: --ensure-dir
--ensure-dir:
	@if [ -z "$(DIR)" ]; then \
  	echo "DIR variable not set" ; \
  	exit 1 ; \
  fi ; \
 	mkdir -p $(DIR) ; \

.PHONY: --swagger
--swagger:
	@echo [$(APP_NAME)] Generating Swagger schema
	@$(API_DIST_BINARY) \
		--kubeconfig=$(KUBECONFIG) \
		--metrics-provider=none \
		--openapi-enabled >/dev/null 2>&1 & curl -s --retry 10 --retry-connrefused $(BIND_ADDRESS):$(PORT)/apidocs.json > $(SCHEMA_DIRECTORY)/swagger.json; pkill $(APP_NAME)
	@echo [$(APP_NAME)] Swagger schema generated successfully

.PHONY: --graphql-mesh
--graphql-mesh:
	@echo [$(APP_NAME)] Generating GraphQL schema
	@$(GRAPHQL_MESH) build --fileType json
	@chmod +rwx .mesh/schema.graphql
	@mv .mesh/schema.graphql $(SCHEMA_DIRECTORY)/schema.graphql
	@rm -rf .mesh
	@echo "[$(APP_NAME)] GraphQL schema generated successfully"
