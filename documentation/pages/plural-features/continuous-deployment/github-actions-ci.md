---
title: Integration With Github Actions
description: How to integrate Plural with Github Actions and other CI providers
---

Plural is generally meant to implement a GitOps based workflow that is somewhat tangential to general CI strategies.  The main point of friction is that CI will usually run against commits against application code, usually resulting in a complete docker image build, but GitOps workflows require a follow-on commit in a secondary infrastructure config repo (or subsection of a monorepo).

Automating that is typically not done, with teams manually managing config files and executing tedious processes.  You also don't want to compromise the security of your GitOps controller by exposing its credentials to a public CI solution like Github Actions.  Plural takes the following approach:

1. You can delegate federated credentials to issue temporary JWTs against your Plural instance to authenticate, with scopes usually limited to minimal changes (eg create a PR)
2. We provide decent prebuilt actions to make integration as simple as possible.

Lets show how its done.

## Create a federated credential

The first step is creating a federated credential to allow a token exchange between Github's OIDC provider and Plural:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: FederatedCredential
metadata:
  name: gh-actions
spec:
  issuer: https://token.actions.githubusercontent.com # the oidc issuer url for gh actions, can be swapped for any other platform with oidc federation support
  user: someone@example.com # should point to the user email you want the federated credential to auth as
  scopes:
    - catalog.write
  claimsLike:
    sub: "repo:pluralsh/console:ref:refs/heads/master" # any regex is supported
```

{% callout severity="info" %}
You can actually use Plural AI to generate these with its built in Kubernetes API discovery integration! Just be sure to select your management cluster in the chat context.
{% /callout %}

## Define the PR Automation

In this case we're going to have Github Actions trigger a PR automation, it can also perform other api actions like kicking a Plural Pipeline as well.  Just to show how it would work, here's an example PR automation spec:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: PrAutomation
metadata:
  name: console-updater
spec:
  name: console-updater
  documentation: Updates the console image version
  updates:
    yamlOverlays:
    - file: "bootstrap/console.yaml"
      yaml: |
        spec:
          helm:
            values:
              image: 
                tag: {{ context.tag }}
  scmConnectionRef:
    name: plural
  title: "Updating console to use {{ context.tag }}"
  message: "Updating console to use {{ context.tag }}"
  identifier: mgmt
  configuration:
  - name: tag
    type: STRING
    documentation: The new image tag to use
```

Notice this is really just overlaying some templated yaml on the existing `bootstrap/console.yaml` file which is deploying our console service. Nothing too crazy, usually image updates are simple.

## Define the Github Action to trigger a PR

Then your github actions file can look something like this, in this case it is executing on all pushes to master

```yaml
name: CI / Trigger PR

env:
  # this configures docker/metadata-action to use the true commit sha when tagging
  DOCKER_METADATA_PR_HEAD_SHA: 'true' 

on:
  push:
    branches:
    - master
jobs:
  pr:
    permissions:
      id-token: write # this is necessary to get a gh id token
      contents: read
      packages: write
    name: Generate PR
    runs-on: ubuntu-latest
    steps:
      - name: Checkout the repo
        uses: actions/checkout@v3
        with:
          fetch-depth: 0
      ################################################################
      # Boilerplate to build a docker image, feel free to skip below #
      ################################################################
      - name: Docker meta
        id: meta
        uses: docker/metadata-action@v4
        with:
          # list of Docker images to use as base name for tags
          images: ghcr.io/pluralsh/console
          # generate Docker tags based on the following events/attributes
          tags: |
            type=sha
      - name: Set up QEMU
        uses: docker/setup-qemu-action@v2
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      - name: Login to GHCR
        uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.repository_owner }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Test Build console image
        uses: docker/build-push-action@v3
        with:
          context: "."
          file: "./Dockerfile"
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          platforms: linux/amd64
          cache-from: type=gha
          cache-to: type=gha,mode=max
      ###############################################################
      # Plural CLI Setup and trigger-pull-request action invocation #
      ###############################################################
      - name: setup plural
        id: plural
        uses: pluralsh/setup-plural@v2
        with:
          email: console@plural.sh
          consoleUrl: https://my.console.cloud.plural.sh
      - name: Set outputs
        id: sha
        run: echo "sha_short=$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT # unfortunately gh actions doesn't expose this natively lol
      - name: Trigger PR
        uses: pluralsh/trigger-pull-request@v2
        with:
          url: https://my.console.cloud.plural.sh
          token: ${{ steps.plural.outputs.consoleToken }}
          branch: plrl/console/update-${{ steps.sha.outputs.sha_short }}
          prAutomation: console-updater # the pr automation name above
          context: |
            {
              "tag": "sha-${{ steps.sha.outputs.sha_short }}"
            }
```