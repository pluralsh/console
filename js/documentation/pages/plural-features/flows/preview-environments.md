---
title: Flow Preview Environments
description: Easily create a first class PR preview environment experience within Flows
---

## Overview

Preview environments are a powerful software testing pattern whereby you create a near clone of a dev environment with the code of a feature branch during the duration of a pull request.  This has a few great benefits:

1. Reduces churn in your dev environment, improving overall stability - which is a common failure in large organizations with many in-flight changes
2. Makes it easier to test code in isolation - the code only has the changes happening in your branch
3. Reduces dev data corruption issues - true if you implement database forking as part of the preview, making it easy to test things like schema migrations

This is extremely easy to implement with Plural because of a few things:

* GitOps patterns make it really easy to redeploy and reconfigure services
* Plural already has the webhook and event system to track PR updates natively implemented within its server
* Plural also already has a secure way of managing SCM credentials, so it can natively implement the Github/Gitlab comment feedback to make an ideal DevEx around preview environments

## Demo Video

If you just want to see it in action, here's a quick YouTube video demo:

{% embed url="https://youtu.be/9hoiQnkgnzQ" aspectRatio="16 / 9" /%}


## How to Implement

Implementing preview environments is quite simple.  You functionally just need to register one custom resource, a `PreviewEnvironmentTemplate` like below:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: PreviewEnvironmentTemplate
metadata:
  name: test
spec:
  flowRef:
    kind: Flow
    name: flow-test

  referenceServiceRef:
    kind: ServiceDeployment
    name: flow-test-dev
    namespace: flow-test
  
  template:
    namespace: "flow-test-pr-{{ pr.number }}"
    name: "flow-test-pr-{{ pr.number }}"

    syncConfig:
      deleteNamespace: true # ensure the temp namespace is deleted on cleanup
      
    helm:
      values:
        image:
          tag: "sha-{{ commitSha | slice: 0, 7 }}"
        
        ingress:
          hosts:
            - host: flow-test-pr-{{ pr.number }}.your.domain # give a unique pr domain for the environment
              paths:
                - path: /
                  pathType: ImplementationSpecific
          tls:
            hosts:
              - flow-test-pr-{{ pr.number }}.your.domain # also ensure certs still work
            secretName: flow-test-pr-{{ pr.number }}-tls
          
```

This will then tell Plural to create a preview environment clone of the `flow-test-dev` `ServiceDeployment` whenever a PR has the following annotation in its body:

```
Plural Flow: flow-test
Plural Preview: test # notice this is the same as the name of the PreviewEnvironmentTemplate
```

the `template` field customizes how you'll override the setting of the source service, in this case it will:

1. deploy it in the `flow-test-pr-{{ pr.number }}` namespace
2. Override the image with `sha-{{ commitSha | slice: 0, 7 }}` (basically the sha image tag we've configured GH actions to build with)

To see how the image was built, you can consult one of our example repos [here](https://github.com/pluralsh/plrl-cd-demo/blob/main/.github/workflows/push.yaml#L48), but the image tagging is easy to accomplish with github actions using:


```yaml
env:
  DOCKER_METADATA_PR_HEAD_SHA: 'true' # necessary for docker to tag with the commit of the actual branch, not github's phantom pr branch

jobs:
  publish-docker:
  ...
  - name: Docker meta
    id: meta
    uses: docker/metadata-action@v5
    with:
    # replace with your registry
    images: |
        ghcr.io/pluralsh/plrl-cd-test 
    # generate Docker tags based on the following events/attributes
    tags: |
        type=sha
        type=ref,event=pr
        type=ref,event=branch
        type=semver,pattern={{version}}  
  - name: Build and push
    uses: docker/build-push-action@v5
    with:
      context: "."
      file: "./Dockerfile"
      push: true
      tags: ${{ steps.meta.outputs.tags }}
      labels: ${{ steps.meta.outputs.labels }}
      platforms: linux/amd64
      cache-from: type=gha
      cache-to: type=gha,mode=max
      build-args: |
        GIT_COMMIT=${{ github.sha }}
```

## Templating variables

The fields of `PreviewEnvironment.spec.template` can include liquid templating with the following preconfigured context variable schema:

```yaml
commitSha: string
pr:
  owner: string # the org or group owning this repo
  repo: string # the name of the repo
  number: number | string # the pull request uniq id
  attributes: {string: string} # a string kv map gathered from using Plural Attribute: {key}={value} in your pr body for additional configuration
```

Like in the case above, you can use that to templatize useful fields like namespace/service names and helm values subfields.

## Constraints

Plural enforces a few constraints on how preview environments can be created:

1. They will only deploy to the same cluster as their source service
2. They will only deploy to a namespace with a name that's prefixed by the original service's namespace
    - this is to prevent preview environments from jumping tenants, but also still make it easy to prevent them from trampling the original service.

