.PHONY: help

help:
	@perl -nle'print $& if m{^[a-zA-Z_-]+:.*?## .*$$}' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

##@ Docker Compose

.PHONY: up-docker
up-docker: ## build and run via docker compose
	docker compose -f docker-compose.yml up --build

.PHONY: test-docker
test-docker: ## run tests via docker compose
	@docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from sign-test; \
	status=$$?; \
	docker compose -f docker-compose.test.yml down; \
	exit $$status

.PHONY: build-docker
build-docker: ## build docker image via compose
	docker compose -f docker-compose.yml build
