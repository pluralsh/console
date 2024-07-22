KUBECTL ?= $(shell which kubectl)
KUSTOMIZE ?= $(shell which kustomize)
HELMIFY := $(shell which helmify)
CONTROLLER_GEN ?= $(shell which controller-gen)
ENVTEST ?= $(shell which setup-envtest)
GOLANGCI_LINT ?= $(shell which golangci-lint)
MOCKERY ?= $(shell which mockery)
ENVSUBST ?= $(shell which envsubst)
HELM ?= $(shell which helm)
CRDDOCS ?= $(shell which crd-ref-docs)
GQLGENC ?= $(shell which gqlgenc)

BINARY_NOT_FOUND_MESSAGE := Run 'make tools' in the 'workspaces' directory to install all required dependencies

# Validate required env variables
ifndef GOPATH
$(warning $$GOPATH environment variable not set)
endif

ifeq (,$(findstring $(GOPATH)/bin,$(PATH)))
$(warning $$GOPATH/bin directory is not in your $$PATH)
endif

# Validate required binaries
ifeq ($(KUBECTL),)
$(error $$KUBECTL binary not found. $(BINARY_NOT_FOUND_MESSAGE))
endif

ifeq ($(KUSTOMIZE),)
$(error kustomize binary not found. $(BINARY_NOT_FOUND_MESSAGE))
endif

ifeq ($(HELMIFY),)
$(error helmify binary not found. $(BINARY_NOT_FOUND_MESSAGE))
endif

ifeq ($(CONTROLLER_GEN),)
$(error controller-gen binary not found. $(BINARY_NOT_FOUND_MESSAGE))
endif

ifeq ($(ENVTEST),)
$(error envtest binary not found. $(BINARY_NOT_FOUND_MESSAGE))
endif

ifeq ($(GOLANGCI_LINT),)
$(error golangci-lint binary not found. $(BINARY_NOT_FOUND_MESSAGE))
endif

ifeq ($(MOCKERY),)
$(error mockery binary not found. $(BINARY_NOT_FOUND_MESSAGE))
endif

ifeq ($(ENVSUBST),)
$(error envsubst binary not found. $(BINARY_NOT_FOUND_MESSAGE))
endif

ifeq ($(HELM),)
$(error helm binary not found. $(BINARY_NOT_FOUND_MESSAGE))
endif

ifeq ($(CRDDOCS),)
$(error crddocs binary not found. $(BINARY_NOT_FOUND_MESSAGE))
endif

ifeq ($(GQLGENC),)
$(error gqlgenc binary not found. $(BINARY_NOT_FOUND_MESSAGE))
endif
