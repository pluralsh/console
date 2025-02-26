##@ Build Dependencies

.PHONY: tools
tools: ## install required tools
tools: --tool

.PHONY: --tool
%--tool: TOOL = .*
--tool: # INTERNAL: installs tool with name provided via $(TOOL) variable or all tools.
	@echo Installing required tools
	@go install github.com/Yamashou/gqlgenc@v0.29.0
	@cat main.go | grep _ | awk -F'"' '$$2 ~ /$(TOOL)/ {print $$2}' | xargs -I {} go install {}
	@echo Tools installed successfully

.PHONY: controller-gen
controller-gen: TOOL = controller-gen
controller-gen: --tool ## Download and install controller-gen in the $GOPATH/bin

.PHONY: kustomize
kustomize: TOOL = kustomize
kustomize: --tool ## Download and install kustomize in the $GOPATH/bin

.PHONY: helmify
helmify: TOOL = helmify
helmify: --tool ## Download and install helmify in the $GOPATH/bin

.PHONY: golangci-lint
golangci-lint: TOOL = golangci-lint
golangci-lint: --tool ## Download and install golangci-lint in the $GOPATH/bin

.PHONY: envtest
envtest: TOOL = setup-envtest
envtest: --tool ## Download and install setup-envtest in the $GOPATH/bin

.PHONY: mockery
mockery: TOOL = mockery
mockery: --tool ## Download and install mockery in the $GOPATH/bin

.PHONY: envsubst
envsubst: TOOL = envsubst
envsubst: --tool ## Download and install envsubst in the $GOPATH/bin

.PHONY: crd-ref-docs
crd-ref-docs: TOOL = crd-ref-docs
crd-ref-docs: --tool ## Download and install crd-ref-docs in the $GOPATH/bin

.PHONY: kubebuilder
kubebuilder: ## ## Download and install kubebuilder in the $GOPATH/bin
	@curl -L -O --output-dir bin/ "https://github.com/kubernetes-sigs/kubebuilder/releases/download/v${KUBEBUILDER_VERSION}/kubebuilder_${OS}_${ARCH}"
	@chmod +x bin/kubebuilder_${OS}_${ARCH}
	@mv bin/kubebuilder_${OS}_${ARCH} ${GOPATH}/bin/kubebuilder
