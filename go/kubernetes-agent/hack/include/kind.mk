include $(PARTIALS_DIR)/config.mk

.PHONY: --ensure-kind-cluster
--ensure-kind-cluster:
	@if test -n "$(shell kind get clusters 2>/dev/null | grep $(KIND_CLUSTER_NAME))"; then \
  	echo [kind] cluster already exists; \
  else \
    echo [kind] creating cluster $(KIND_CLUSTER_NAME); \
    kind create cluster -q --config=$(KIND_CONFIG_FILE) --name=$(KIND_CLUSTER_NAME) --image=$(KIND_CLUSTER_IMAGE); \
  fi; \
  echo [kind] exporting internal kubeconfig to $(TMP_DIR); \
  mkdir -p $(TMP_DIR); \
  kind get kubeconfig --name $(KIND_CLUSTER_NAME) --internal > $(KIND_CLUSTER_INTERNAL_KUBECONFIG_PATH)

.PHONY: --ensure-kind-ingress-nginx
--ensure-kind-ingress-nginx:
	@echo [kind] installing ingress-nginx
	@kubectl --context $(KIND_CLUSTER_KUBECONFIG_CONTEXT) apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-$(INGRESS_NGINX_VERSION)/deploy/static/provider/kind/deploy.yaml >/dev/null
	@kubectl delete -A ValidatingWebhookConfiguration ingress-nginx-admission >/dev/null

.PHONY: --kind-load-images
--kind-load-images:
	@echo Loading redis:$(REDIS_VERSION) into kind cluster
	@kind load docker-image -n $(KIND_CLUSTER_NAME) redis:$(REDIS_VERSION) >/dev/null
	@echo Loading kubernetes-agent:latest into kind cluster
	@kind load docker-image -n $(KIND_CLUSTER_NAME) kubernetes-agent:latest >/dev/null

