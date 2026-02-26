ROOT_DIRECTORY = $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))/../..

# Global makefile partial config
include $(ROOT_DIRECTORY)/hack/include/config.mk

# Local makefile partial config
include $(TOOLS_DIR)/os.mk

GO_INSTALL_TOOLS := $(shell cat $(TOOLS_DIR)/tools.go | grep _ | awk -F'"' '$$2 ~ /.*/ {print $$2}')
TOOL_VERSIONS := $(shell awk '/require \(/{flag=1; next} flag&&/\)/{exit} flag' $(TOOLS_DIR)/go.mod | awk '{sub(/[ \t\r]+/, "");}1' | awk '{sub(/ /, "@");}1' | tr '\n' ' ')

##@ Build Dependencies

.PHONY: tools
tools: ## install required tools
tools: --tool install-protoc

.PHONY: --tool
%--tool: TOOL = .*
--tool: --ensure-binaries-dir # INTERNAL: installs tool with name provided via $(TOOL) variable or all tools.
	@for tool in $(TOOL_VERSIONS); do \
  		dependency=$$(echo $${tool} | cut -d'@' -f1) ;\
  		version=$$(echo $$tool | cut -d'@' -f2) ;\
  		for path in $(GO_INSTALL_TOOLS); do \
  		  match=$$(echo "$(TOOL)" | xargs) ;\
  		  if echo $${path} | grep -qE "$${match}"; then \
  		  	if echo $${path} | grep -q $${dependency}; then \
  		  	  if [ -f "$(BINARIES_DIR)/$${path##*/}" ]; then \
  		  	    echo "[tools] $${path##*/} is already installed, skipping..." ;\
  		  	  else \
  		  	    echo "[tools] Installing $${path##*/}@$${version}" ;\
            	GOBIN=$(BINARIES_DIR) go install $${path}@$${version} ;\
  		  	  fi ;\
  		  	fi ;\
  		  fi ;\
  		done ;\
  	done

.PHONY: --ensure-binaries-dir
--ensure-binaries-dir:
	@mkdir -p $(BINARIES_DIR)

.PHONY: install-goimports
install-goimports: TOOL = goimports
install-goimports: --tool ## Download and install goimports in the $BINARIES_DIR

.PHONY: install-golangci-lint
install-golangci-lint: TOOL = golangci-lint
install-golangci-lint: --tool ## Download and install golangci-lint in the $BINARIES_DIR

.PHONY: install-protoc-gen-go
install-protoc-gen-go: TOOL = protoc-gen-go
install-protoc-gen-go: --tool ## Download and install protoc-gen-go in the $BINARIES_DIR

.PHONY: install-protoc-gen-go-grpc
install-protoc-gen-go-grpc: TOOL = protoc-gen-go-grpc
install-protoc-gen-go-grpc: --tool ## Download and install protoc-gen-go-grpc in the $BINARIES_DIR

.PHONY: install-mockgen
install-mockgen: TOOL = mockgen
install-mockgen: --tool # Download and install mockgen in the $BINARIES_DIR

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

.PHONY: install-node
install-node: --ensure-binaries-dir ## Download and install Node.js in the $(BINARIES_DIR)
	@if [ ! -f "$(BINARIES_DIR)/node" ]; then \
	  NODE_VERSION="24.11.1" && \
	  NODE_VERSION="$${NODE_VERSION:-$(NODE_VERSION)}" && \
	  echo "Installing node v$${NODE_VERSION} into $(BINARIES_DIR)" && \
	  OS=$$(uname -s | tr '[:upper:]' '[:lower:]') && \
	  case "$$OS" in \
	    darwin) NODE_OS=darwin ;; \
	    linux) NODE_OS=linux ;; \
	    *) echo "Unsupported OS: $$OS"; exit 1 ;; \
	  esac && \
	  ARCH=$$(uname -m) && \
	  case "$$ARCH" in \
	    x86_64|amd64) NODE_ARCH=x64 ;; \
	    aarch64|arm64) NODE_ARCH=arm64 ;; \
	    *) echo "Unsupported ARCH: $$ARCH"; exit 1 ;; \
	  esac && \
	  NODE_DISTRO="node-v$${NODE_VERSION}-$$NODE_OS-$$NODE_ARCH" && \
	  TAR="$${NODE_DISTRO}.tar.xz" && \
	  TEMP_DIR=$$(mktemp -d) && \
	  curl -sSL "https://nodejs.org/dist/v$${NODE_VERSION}/$${TAR}" -o "$${TEMP_DIR}/$${TAR}" && \
	  tar -xJ -C "$${TEMP_DIR}" -f "$${TEMP_DIR}/$${TAR}" && \
	  mkdir -p "$(BINARIES_DIR)/lib" && \
	  cp -a "$${TEMP_DIR}/$${NODE_DISTRO}/bin/node" "$(BINARIES_DIR)/" && \
	  if [ -d "$${TEMP_DIR}/$${NODE_DISTRO}/lib/node_modules/npm" ]; then \
	    cp -a "$${TEMP_DIR}/$${NODE_DISTRO}/lib/node_modules" "$(BINARIES_DIR)/lib/"; \
	  fi && \
	  ln -s "$(BINARIES_DIR)/lib/node_modules/npm/bin/npm-cli.js" "$(BINARIES_DIR)/npm" && \
	  rm -rf "$${TEMP_DIR}" && \
	  echo "Installed node v$${NODE_VERSION} in $(BINARIES_DIR)/node"; \
	else \
	  echo "[tools] node is already installed, skipping..."; \
	fi

.PHONY: install-graphql-mesh
install-graphql-mesh: install-node --ensure-binaries-dir ## Install graphql-mesh into the `$(BINARIES_DIR)`
	@if [ ! -d "$(BINARIES_DIR)/lib/node_modules/@graphql-mesh" ]; then \
		echo "[tools] Installing graphql-mesh into $(BINARIES_DIR)" ;\
		PATH="$(BINARIES_DIR):$$PATH" $(NPM) install -g --prefix "$(BINARIES_DIR)" graphql @graphql-mesh/cli @graphql-mesh/openapi @graphql-mesh/runtime @graphql-mesh/transform-replace-field ;\
		echo "Installed graphql-mesh in $(BINARIES_DIR)"; \
	else \
		echo "[tools] graphql-mesh is already installed, skipping..."; \
	fi
