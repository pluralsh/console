.PHONY: help

JS_ROOT := $(abspath ..)
YARN := node $(JS_ROOT)/.yarn/releases/yarn-4.17.1.cjs --cwd $(JS_ROOT)

help:
	@perl -nle'print $& if m{^[a-zA-Z_-]+:.*?## .*$$}' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

yarn-install: .PHONY
	$(YARN) install --immutable

web: ## runs the docs site locally
	$(YARN) workspace @pluralsh/documentation dev

routes:
	$(YARN) workspace @pluralsh/documentation generate:route-index

sync:
	cp ../../go/controller/docs/api.md pages/api-reference/kubernetes/management-api-reference.md
	cp ../../go/deployment-operator/docs/api.md pages/api-reference/kubernetes/agent-api-reference.md
	cp ../../go/polly/docs/liquid-filters.md pages/plural-features/service-templating/supporting-liquid-filters.md