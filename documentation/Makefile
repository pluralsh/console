.PHONY: help

help:
	@perl -nle'print $& if m{^[a-zA-Z_-]+:.*?## .*$$}' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

yarn-install: .PHONY
	yarn --immutable

web: ## runs the docs site locally
	yarn dev

routes:
	yarn generate:route-index

sync-docs: sync-console-crd-docs sync-operator-crd-docs sync-liquid-docs

sync-console-crd-docs:
	curl -L https://raw.githubusercontent.com/pluralsh/console/master/go/controller/docs/api.md --output pages/api-reference/kubernetes/management-api-reference.md

sync-operator-crd-docs:
	curl -L https://raw.githubusercontent.com/pluralsh/console/master/go/deployment-operator/docs/api.md --output pages/api-reference/kubernetes/agent-api-reference.md

sync-liquid-docs:
	curl -L https://raw.githubusercontent.com/pluralsh/console/master/go/polly/docs/liquid-filters.md --output pages/plural-features/service-templating/supporting-liquid-filters.md