---
title: Pipelines
description: Automate the journey of code from development to production
---

Plural Pipelines provide a way to automate the GitOps changes necessary to promote software across environments. The standard approach would be something like this:

1. Create a PR for dev, wait for review and merge
2. Create a PR for staging, same as above
3. Finally, create a PR for prod and you're done.

This is tedious and completely unnecessary. You'll also want to automate a variety of confirmation tests along the promotion process, which can be missed in a manual pattern.

Plural solves this by:

1. Allowing users to define their promotion flow via CRD
2. Auto-generating a PR at each stage using Plural's PR automation capabilities.
3. Using gates between stages to control promotion, with a variety of checks that can be performed.

## Pipeline Flavors

There are two ways to accomplish a pipeline with Plural:

* Deterministic [PR Automation](/plural-features/pr-automation/crds)-based pipelining
* AI-based PR pipelining

The main difference is that the second uses prompting plus lightweight coding agents to make the YAML changes needed to promote your software. Since these are usually small config changes, this approach is very reliable and often much easier to set up for developers of all skill levels, but for teams that want the security of determinism, that option is available as well.

Before we go into exact pipeline examples, assume we have two Plural services defined in a file `bootstrap/guestbook.yaml` like so:

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

You can define these pipelines with either a deterministic or an AI-based method. For a **deterministic** Pipeline:

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
Notice that in each case, a PR automation is specified as the promotion criteria. You would need to define this as a separate `PrAutomation` CRD.
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

This is a lot simpler and easier to manage. You might also have noticed the gates on the edge definition, which are explained below.

## Pipeline Gates Variants

Gates serve as checkpoints between pipeline stages, ensuring a change is safe to promote. They have four main variants:

1. APPROVAL - manual sign-off in the Plural UI.
2. WINDOW - time-based constraint for promotion
3. JOB - allows you to run a dedicated integration test job on a cluster
4. SENTINEL - run a full [Plural Sentinel](/plural-features/plural-ai/sentinels) to blast integration tests throughout your infrastructure. Useful for wide testing, e.g. when you're doing cluster upgrades throughout your dev fleet.

{% callout severity="info" %}
We often use Pipelines to manage fleet-wide promotions, for instance mass cluster upgrades, or mass Kubernetes operator upgrades. A GitOps approach is ideal for those one-to-many deployment scenarios, and the Sentinel promotion gate pairs naturally with it, giving you a mass test lifecycle to confirm those changes rather than just executing them.
{% /callout %}
