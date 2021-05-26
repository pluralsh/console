.PHONY: help

GCP_PROJECT ?= pluralsh
APP_NAME ?= console
APP_VSN ?= `cat VERSION`
BUILD ?= `git rev-parse --short HEAD`
DKR_HOST ?= dkr.plural.sh
PLRL_WWW ?= ../plural/www/src
dep ?= forge-core

help:
	@perl -nle'print $& if m{^[a-zA-Z_-]+:.*?## .*$$}' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

build: ## Build the Docker image
	docker build --build-arg APP_NAME=$(APP_NAME) \
		--build-arg APP_VSN=$(APP_VSN) \
		-t $(APP_NAME):$(APP_VSN) \
		-t $(APP_NAME):latest \
		-t gcr.io/$(GCP_PROJECT)/$(APP_NAME):$(APP_VSN) \
		-t $(DKR_HOST)/console/$(APP_NAME):$(APP_VSN) .

push: ## push to gcr
	docker push gcr.io/$(GCP_PROJECT)/$(APP_NAME):$(APP_VSN)
	docker push $(DKR_HOST)/console/$(APP_NAME):$(APP_VSN)

testup: ## sets up dependent services for test
	docker-compose up -d

testdown: ## tear down test dependencies
	docker-compose down

connectdb: ## proxies the db in kubernetes via kubectl
	@echo "run psql -U forge -h 127.0.0.1 forge to connect"
	kubectl port-forward statefulset/watchman-postgresql 5432 -n watchman

web: ## starts a local webserver
	cd assets && yarn start

yarn-add: ## adds a yarn dep
	cd assets && yarn add $(dep)

import-incidents:
	mv assets/src/components/incidents/queries.js queries.js
	mv assets/src/components/incidents/Presence.js Presence.js
	cp $(PLRL_WWW)/components/incidents/* assets/src/components/incidents
	mv queries.js assets/src/components/incidents/queries.js
	mv Presence.js assets/src/components/incidents/Presence.js
	sed -i '' -- 's/\.\.\/models/graphql/g' assets/src/components/incidents/*
	sed -i '' -- 's/\.\/login/\.\/forge/g' assets/src/components/incidents/*
	cp $(PLRL_WWW)/components/repos/Tags.js assets/src/components/repos/Tags.js
	cp $(PLRL_WWW)/components/utils/AlternatingBox.js assets/src/components/utils/AlternatingBox.js
	cp $(PLRL_WWW)/components/utils/TypeaheadEditor.js assets/src/components/utils/TypeaheadEditor.js
	cp $(PLRL_WWW)/components/utils/Tooltip.js assets/src/components/utils/Tooltip.js
	cp $(PLRL_WWW)/components/utils/SmoothScroller.js assets/src/components/utils/SmoothScroller.js
	cp $(PLRL_WWW)/components/utils/hooks.js assets/src/components/utils/hooks.js
	cp $(PLRL_WWW)/components/utils/icons.js assets/src/components/utils/icons.js
	cp $(PLRL_WWW)/components/utils/TimedCache.js assets/src/components/utils/TimedCache.js
	cp $(PLRL_WWW)/utils/date.js assets/src/utils/date.js
	cp $(PLRL_WWW)/utils/graphql.js assets/src/utils/graphql.js
	cp $(PLRL_WWW)/utils/slate.js assets/src/utils/slate.js