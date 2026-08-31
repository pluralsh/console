---
title: Pipelines
description: Automate the journey of code from development to production
---

Plural Pipelines provide a way to automate the GitOps changes necessary to promote software across environments. The standard approach would be something like this:

1. Create a PR for dev, wait for review and merge
2. Create a PR for staging, same as above
3. finally create a PR for prod and you're done.

This is tedious and completely unnecessary.  In addition, you'll also want to automate a variety of confirmation tests along the promotion process, which can be missed in a manual pattern.

Plural solves this by:

1. Allowing users to define their promotion flow via CRD
2. Across all stages, a PR is auto-generated using Plural's pr automation capabilities.
3. Between stages, gates can be used to control promotion, with a variety of different checks that can be performed.

## Pipeline Flavors

There are two ways to accomplish a pipeline with Plural:

* Deterministic [PR Automation](/plural-features/pr-automation/crds) based pipelining
* AI based PR based pipelining

The main difference is the second uses prompting plus lightweight coding agents to accomplish the needed yaml changes to promote your software.  Since they are usually small config changes, this is usually very reliable, and often much easier to setup for developers of all skill levels, but for teams that desire the security of determinism, that is available as well.

Before we go into exact pipeline examples, assume we have two plural services defined in a file `bootstrap/guestbook.yaml` like so:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: guestbook-dev
  namespace: infra
spec:
  cluster: dev
  configuration:
    image: 0.0.1
  git:
    folder: guestbook
    ref: master
    url: git@github.com:pluralsh/guestbook.git
---
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: guestbook-prod
  namespace: infra
spec:
  cluster: prod
  configuration:
    image: 0.0.1
  git:
    folder: guestbook
    ref: master
    url: git@github.com:pluralsh/guestbook.git 
```

We have either a deterministic or AI based method to define these pipelines. For a **deterministic** Pipeline:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: Pipeline
metadata:
  name: test
  namespace: infra
spec:
  stages:
    - name: dev
      services:
        - serviceRef:
            name: guestbook-dev
            namespace: infra
          criteria:
            prAutomationRef:
              name: guestbook-updater # use this pr automation to update this service
    - name: prod
      services:
        - serviceRef:
            name: guestbook-prod
            namespace: infra
          criteria:
            prAutomationRef:
              name: guestbook-updater # same as above
  edges:
    - from: dev
      to: prod
      gates:
        - name: sentinel
          type: SENTINEL # organize integration testing with a sentinel
          sentinelRef:
            name: dev-sentinel
            namespace: infra
        - name: approval-gate
          type: APPROVAL
```

{% callout severity="info" %}
Notice in each case, there's a pr automation specified as the promotion criteria.  You would need to define this as a separate `PrAutomation` crd.
{% /callout %}

An AI pipeline is simpler and more self-contained:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: Pipeline
metadata:
  name: test
  namespace: infra
spec:
  stages:
    - name: dev
      services:
        - serviceRef:
            name: guestbook-dev
            namespace: infra
          criteria:
            repository: pluralsh/demo-infra # github slug for our GitOps repository
            ai:
              enabled: true
              prompt: |
                Update the dev guestbook service for me to {{ context.image }}. it should be in the `bootstrap/guestbook.yaml` file.
    - name: prod
      services:
        - serviceRef:
            name: guestbook-prod
            namespace: infra
          criteria:
            repository: pluralsh/demo-infra
            ai:
              enabled: true
              prompt: |
                Update the prod guestbook service for me to {{ context.image }}. it should be in the `bootstrap/guestbook.yaml` file.
  edges:
    - from: dev
      to: prod
      gates:
        - name: sentinel
          type: SENTINEL # organize integration testing with a sentinel
          sentinelRef:
            name: dev-sentinel
            namespace: infra
        - name: approval-gate
          type: APPROVAL
```

Obviously a lot simpler and easier to manage if you wish to do so.  Another thing you might have noticed is the Gates on the edge definition. We can explain those as well.

## Pipeline Gates Variants

Gates serve as checkpoints between pipeline stages ensuring a change is safe to promote.  They have four main variants:

1. APPROVAL - manual signoff in the Plural UI.
2. WINDOW - time based constraint for promotion
3. JOB - allows you to run a dedicated integration test job on a cluster
4. SENTINEL - run a full [Plural Sentinel](/plural-features/plural-ai/sentinels) to blast integration tests throughout your infrastructure.  Useful for wide testing, eg when you're doing cluster upgrades throughout your dev fleet.

{% callout severity="info" %}
We often use Pipelines to manage fleet-wide promotions, for instance mass cluster upgrades, or mass kubernetes operator upgrades.  A GitOps approach is ideal for those one-to-many deployment scenarios, and the Sentinel promotion gate naturally pairs with that in giving you a mass test lifecycle to confirm those changes alongside just executing them.
{% /callout %}
