.PHONY: help up-docker test-docker build-docker

help:
	@perl -nle'print $& if m{^[a-zA-Z_-]+:.*?## .*$$}' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

up-docker: ## build and serve frontend via docker compose (BASE_URL=..., VITE_PROD_SECRET_KEY=...)
	COMPOSE_MENU=0 BASE_URL=$(BASE_URL) VITE_PROD_SECRET_KEY=$(VITE_PROD_SECRET_KEY) docker compose -f docker-compose.yml up --build

test-docker: ## run frontend tests via docker compose
	@docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from frontend-test; \
	status=$$?; \
	docker compose -f docker-compose.test.yml down; \
	exit $$status

build-docker: ## build frontend docker image via compose
	docker compose -f docker-compose.yml build
