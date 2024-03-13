.PHONY: help

GCP_PROJECT ?= pluralsh
APP_NAME ?= console
APP_VSN ?= `git describe`
BUILD ?= `git rev-parse --short HEAD`
DKR_HOST ?= dkr.plural.sh
PLRL_WWW ?= ../plural/www/src
dep ?= forge-core
GIT_COMMIT ?= abd123
TARGETARCH ?= amd64
ERLANG_VERSION ?= `grep erlang .tool-versions | cut -d' ' -f2`
REPO_ROOT ?= `pwd`

help:
	@perl -nle'print $& if m{^[a-zA-Z_-]+:.*?## .*$$}' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

find-versions:
	gcloud container get-server-config --zone=us-central1-f --format=json > k8s-versions/gke.json
	aws eks describe-addon-versions | jq -r ".addons[] | .addonVersions[] | .compatibilities[] | .clusterVersion" | sort | uniq > k8s-versions/eks.json
	az aks get-versions --location eastus --output json > k8s-versions/aks.json

build: ## Build the Docker image
	docker build --build-arg GIT_COMMIT=$(GIT_COMMIT) \
		--build-arg TARGETARCH=$(TARGETARCH) \
		-t $(APP_NAME):$(APP_VSN) \
		-t $(APP_NAME):latest \
		-t gcr.io/$(GCP_PROJECT)/$(APP_NAME):$(APP_VSN) \
		-t $(DKR_HOST)/console/$(APP_NAME):$(APP_VSN) .

helm-dependencies:
	cd charts/console && helm dependency update && \
	cd ../../plural/helm/console && helm dependency update

push: ## push to gcr
	docker push gcr.io/$(GCP_PROJECT)/$(APP_NAME):$(APP_VSN)
	docker push $(DKR_HOST)/console/$(APP_NAME):$(APP_VSN)

reshim: ## reshims erlang into asdf
	cp -r /opt/homebrew/opt/erlang@24/lib/erlang ~/.asdf/installs/erlang/$(ERLANG_VERSION)
	asdf reshim erlang $(ERLANG_VERSION)

deploy: ## deploy artifacts to plural
	cd plural && plural apply

testup: ## sets up dependent services for test
	docker-compose up -d

testdown: ## tear down test dependencies
	docker-compose down

migration:
	MIX_ENV=test mix ecto.gen.migration $(name)

web: ## starts a local webserver
	cd assets && yarn start

gql-codegen: ## generates introspection information for our graph
	cd assets && yarn run graphql-codegen

yarn-add: ## adds a yarn dep
	cd assets && yarn add $(dep)

release-vsn: # tags and pushes a new release
	@read -p "Version: " tag; \
	git checkout master; \
	git pull --rebase; \
	git tag -a $$tag -m "new release"; \
	git push origin $$tag

update-schema:
	MIX_ENV=test mix absinthe.schema.sdl --schema Console.GraphQl  schema/schema.graphql
	curl -o assets/schema/kubernetes-schema.graphql https://raw.githubusercontent.com/kubernetes/dashboard/master/modules/web/schema/schema.graphql
	cd assets && yarn graphql:codegen
	cd assets && yarn fix


k3s:  ## starts a k3d cluster for testing
	@read -p "cluster name: " name; \
	k3d cluster create $$name --image docker.io/rancher/k3s:v1.26.11-k3s2

delete-tag:  ## deletes a tag from git locally and upstream
	@read -p "Version: " tag; \
	git tag -d $$tag; \
	git push origin :$$tag
