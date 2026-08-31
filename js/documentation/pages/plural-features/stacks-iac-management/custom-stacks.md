---
title: Custom stacks
description: Define your own command workflows to be executed via Stacks
---

## Overview

Plural allows for you to define your own command workflows in place of the standard patterns for tools, like the `terraform plan` -> `terraform apply` chain for terraform, or `ansible-playbook` command for ansible.  This can serve a number of useful purposes:

1. Supporting a GitOps workflow for cli-based kubernetes provisioners like `k3s` or GKE anthos' `gkectl`.
2. Supporting in-house provisioner scripts you'd want a more scalable, GitOps approach to configuration for, alongside the elegant UI the Plural Console can offer.
3. Automating bulk scripting based on any declarative config, each forcing manual node refreshes

It works off a `StackDefinition` resource, and requires extending one of our base docker images.

## Extend a Plural `harness` container image

The first step to defining your own custom stack is building your own base image.  The standard path here is to simply extend ours, copying the `harness` binary into an executable path.  This [PR](https://github.com/pluralsh/deployment-operator/pull/248) provides a simple example of how that can be done, with the new image simply consisting of a debian base with the AWS cli installed.

There are a few potential things to notice (all solved in the PR):

1. For security reasons, we always execute stacks with the 65535 uid.  This is to prevent run-as-root vulnerabilities, but also means you might need to manually create that user and its home directory in your image if you're installing utilities that might need them.
2. The images you can use are in either the `ghcr.io/pluralsh/stackrun-harness-base` repository or the `ghcr.io/pluralsh/harness` repository.  The latter has finished images with `terraform`, `ansible` and other executables installed.
3. You should make sure to include the WORKDIR and ENTRYPOINT as in the existing images, eg:

```
WORKDIR /plural

ENTRYPOINT ["harness", "--working-dir=/plural"]
```

## Creating a StackDefinition

Stack definition CRDs are actually pretty self-explanatory, they just specify the commands you'll want the stack to run and any base configuration.  Here's an example:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: StackDefinition
metadata:
  name: my-custom-stack
spec:
  description: "example of a basic custom stack"
  configuration:
    image: ghcr.io/pluralsh/harness # replace with your new base image
    tag: 0.4.42-terraform-1.8 # replace with your new tag
  steps:
  - cmd: /bin/sh
    args:
    - ./stack.sh
    stage: PLAN
  - cmd: echo
    args:
    - APPLYING
    stage: APPLY
```

The `stage` field maps to the standard terraform workflow, with the main point of importance being the `APPLY` stage cannot be executed until the stack has been approved, if it has enabled `approval` on its spec.

The `configuration` block is a way to specify default image setup for stacks using this definition.

## Instantiating a Custom Stack

Finally creating an instance of your custom stack is very quick, simply create an `InfrastructureStack` resource pointing to the `StackDefinition`:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: InfrastructureStack
metadata:
  name: custom
spec:
  name: custom
  detach: false
  type: CUSTOM # must be this type
  approval: true
  stackDefinitionRef:
    name: my-custom-stack # points to CR above
    namespace: stacks
  repositoryRef:
    name: infra
    namespace: infra
  clusterRef:
    name: mgmt
    namespace: infra
  git:
    ref: main
    folder: stacks/custom
```