.PHONY: --ensure
--ensure: --ensure-golangci-lint

GOLANGCI_LINT_BINARY := $(shell which golangci-lint)
.PHONY: --ensure-golangci-lint
--ensure-golangci-lint:
ifndef GOLANGCI_LINT_BINARY
	@echo "golangci-lint not found, see how to install it at https://golangci-lint.run/usage/install/#local-installation"
	@exit 1
else
	@echo "golangci-lint is available"
endif