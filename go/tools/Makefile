##@ Build Dependencies
ROOT_DIRECTORY := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))/../..

include $(ROOT_DIRECTORY)/go/paths.mk
include os.mk

GO_INSTALL_TOOLS := $(shell cat $(TOOLS_DIR)/tools.go | grep _ | awk -F'"' '$$2 ~ /.*/ {print $$2}')
TOOL_VERSIONS := $(shell awk '/require \(/{flag=1; next} flag&&/\)/{exit} flag' $(TOOLS_DIR)/go.mod | awk '{sub(/[ \t\r]+/, "");}1' | awk '{sub(/ /, "@");}1' | tr '\n' ' ')

ARCH := $(shell go env GOARCH)
OS := $(shell go env GOOS)
KUBEBUILDER_VERSION := 4.5.1

.PHONY: tools
tools: ## install required tools
tools: --tool install-kubebuilder install-protoc

.PHONY: --tool
%--tool: TOOL = .*
--tool: --ensure-binaries-dir # INTERNAL: installs tool with name provided via $(TOOL) variable or all tools.
	@for tool in $(TOOL_VERSIONS); do \
  		dependency=$$(echo $${tool} | cut -d'@' -f1) ;\
  		version=$$(echo $$tool | cut -d'@' -f2) ;\
  		for path in $(GO_INSTALL_TOOLS); do \
  		  match=$$(echo "$(TOOL)" | tr ' ' '|') ;\
  		  if echo $${path} | grep -qE "$${match}"; then \
  		  	if echo $${path} | grep -q $${dependency}; then \
			  echo Installing $${path}@$${version} ;\
  		  	  GOBIN=$(BINARIES_DIR) go install $${path}@$${version} ;\
  		  	fi ;\
  		  fi ;\
  		done ;\
  	done

.PHONY: --ensure-binaries-dir
--ensure-binaries-dir:
	@mkdir -p $(BINARIES_DIR)

.PHONY: install-controller-gen
install-controller-gen: TOOL = controller-gen
install-controller-gen: --tool ## Download and install controller-gen in the $BINARIES_DIR

.PHONY: install-crd-ref-docs
install-crd-ref-docs: TOOL = crd-ref-docs
install-crd-ref-docs: --tool ## Download and install crd-ref-docs in the $BINARIES_DIR

.PHONY: install-envsubst
install-envsubst: TOOL = envsubst
install-envsubst: --tool ## Download and install envsubst in the $BINARIES_DIR

.PHONY: install-goimports
install-goimports: TOOL = goimports
install-goimports: --tool ## Download and install goimports in the $BINARIES_DIR

.PHONY: install-golangci-lint
install-golangci-lint: TOOL = golangci-lint
install-golangci-lint: --tool ## Download and install golangci-lint in the $BINARIES_DIR

.PHONY: install-gqlgen
install-gqlgen: TOOL = gqlgen
install-gqlgen: --tool ## Download and install gqlgenc in the $BINARIES_DIR

.PHONY: install-gqlgenc
install-gqlgenc: TOOL = gqlgenc
install-gqlgenc: --tool ## Download and install gqlgenc in the $BINARIES_DIR

.PHONY: install-helmify
install-helmify: TOOL = helmify
install-helmify: --tool ## Download and install helmify in the $BINARIES_DIR

.PHONY: install-kubebuilder
install-kubebuilder: --ensure-binaries-dir ## ## Download and install kubebuilder in the $BINARIES_DIR
	@curl -L -O -s --output-dir $(BINARIES_DIR) "https://github.com/kubernetes-sigs/kubebuilder/releases/download/v${KUBEBUILDER_VERSION}/kubebuilder_$(OS)_$(ARCH)"
	@chmod +x $(BINARIES_DIR)/kubebuilder_$(OS)_$(ARCH)
	@mv $(BINARIES_DIR)/kubebuilder_$(OS)_$(ARCH) $(BINARIES_DIR)/kubebuilder

.PHONY: install-kustomize
install-kustomize: TOOL = kustomize
install-kustomize: --tool ## Download and install kustomize in the $BINARIES_DIR

.PHONY: install-mockery
install-mockery: TOOL = mockery
install-mockery: --tool ## Download and install mockery in the $BINARIES_DIR

.PHONY: install-envtest
install-envtest: TOOL = setup-envtest
install-envtest: --tool ## Download and install setup-envtest in the $BINARIES_DIR

.PHONY: install-ginkgo
install-ginkgo: TOOL = ginkgo
install-ginkgo: --tool ## Download and install ginkgo in the $BINARIES_DIR

.PHONY: install-protoc-gen-go
install-protoc-gen-go: TOOL = protoc-gen-go
install-protoc-gen-go: --tool ## Download and install protoc-gen-go in the $BINARIES_DIR

.PHONY: install-protoc-gen-go-grpc
install-protoc-gen-go-grpc: TOOL = protoc-gen-go-grpc
install-protoc-gen-go-grpc: --tool ## Download and install protoc-gen-go-grpc in the $BINARIES_DIR



.PHONY: install-protoc
install-protoc: --ensure-binaries-dir ## Download and install protoc compiler in the $BINARIES_DIR
	@if [ ! -f "$(BINARIES_DIR)/protoc" ]; then \
		PROTOC_VERSION="31.1" && \
		PROTOC_ZIP="protoc-$${PROTOC_VERSION}-${PROTOC_OS}-${PROTOC_ARCH}.zip" && \
		TEMP_DIR=$$(mktemp -d) && \
		curl -sSL "https://github.com/protocolbuffers/protobuf/releases/download/v$${PROTOC_VERSION}/$${PROTOC_ZIP}" -o "$${TEMP_DIR}/$${PROTOC_ZIP}" && \
		unzip -q "$${TEMP_DIR}/$${PROTOC_ZIP}" -d "$${TEMP_DIR}" && \
		mv "$${TEMP_DIR}/bin/protoc" "$(BINARIES_DIR)/" && \
		rm -rf "$${TEMP_DIR}" && \
		echo "Installed protoc in $(BINARIES_DIR)/protoc"; \
	fi