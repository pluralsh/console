---
title: PR automation pipelines
description: Use PR automations to generate revisions throughout a pipeline
---

Plural Pipelines do not ordinarily require human intervention to deploy their services, instead relying on common conventions like passing along Git SHAs plus configured secrets to ferry code changes along. That said, there are still cases where you'd want a PR to perform each update:

- Robust GitOps flows where you need an auditable approval for each change
- Cases where other automations (e.g. GitOps app-of-apps or Terraform) could interfere with the changes from a pipeline

Plural PR Automation pipelines provide a simple but highly configurable way to build extensible, auditable, yet automated workflows that meet those sorts of constraints.

## Setup

Here's a quick and dirty dev-to-prod pipeline with PR automations to execute the changes in each stage.

In `dev.yaml`:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: podinfo-dev
spec:
  name: podinfo
  namespace: podinfo
  helm:
    chart: podinfo
    version: 6.5.3 # VERSION
    repository:
      name: podinfo
      namespace: infra
  clusterRef:
    kind: Cluster
    name: boot-staging
    namespace: infra
```

In `prod.yaml`:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: podinfo-prod
spec:
  name: podinfo
  namespace: podinfo
  helm:
    chart: podinfo
    version: 6.5.3 # VERSION
    repository:
      name: podinfo
      namespace: infra
  clusterRef:
    kind: Cluster
    name: boot-prod
    namespace: infra
```

In `pipeline.yaml`:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: Pipeline
metadata:
  name: pr-automation
spec:
  stages:
    - name: dev
      services:
        - serviceRef:
            name: podinfo-dev
            namespace: infra
          criteria:
            prAutomationRef:
              name: podinfo-pipeline
    - name: prod
      services:
        - serviceRef:
            name: podinfo-prod
            namespace: infra
          criteria:
            prAutomationRef:
              name: podinfo-pipeline
  edges:
    - from: dev
      to: prod
      gates:
        - name: approval-gate
          type: APPROVAL
```

In `prautomation.yaml`:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: PrAutomation
metadata:
  name: podinfo-pipeline
spec:
  name: podinfo-pipeline
  documentation: Updates the podinfo service to a specified helm version for any pipeline stage
  updates:
    regexReplacements:
      - regex: 'version: (.*) # VERSION'
        file: apps/pipeline/{{ context.pipeline.stage.name }}.yaml
        replacement: 'version: {{ context.version }} # VERSION'
  scmConnectionRef:
    name: gh-test
  title: 'Updating pod info prod helm version to {{ context.version }} (stage={{ context.pipeline.stage.name }})'
  message: 'Updating pod info prod helm version to {{ context.version }} (stage={{ context.pipeline.stage.name }})'
  identifier: pluralsh/plrl-boot-aws
  configuration:
    - name: version
      type: STRING
      documentation: The helm chart version to use
```

## How it works

The `{dev,prod}.yaml` files configure the two podinfo services. Notice the `# VERSION` comment in each. It's there to simplify the regex logic used by the PR automation in `prautomation.yaml`, and is a generally useful trick when configuring these workflows.

The PR Automation itself is templated, and uses the default `pipeline` object to infer the stage it's applied to, reducing the configuration burden for you. When triggered by the dev stage, it'll work off the `apps/pipeline/dev.yaml` file, and similarly the `apps/pipeline/prod.yaml` file for the prod stage.

The Pipeline YAML file configures the pipeline end-to-end, and you can see each stage service has promotion criteria pointing to the configured PR automation. That tells the pipeline to trigger the PR creation process when that stage is active. To move from dev -> prod, a manual approval is required, as specified in the edge configuration.

## Kicking a run off

To initiate the pipeline, you need to create a pipeline context, which you can easily do via CRD, e.g.:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: PipelineContext
metadata:
  name: podinfo-context
spec:
  pipelineRef:
    name: pr-automation
    namespace: infra
  context:
    version: 6.5.4
```

## Add an integration test

Many orgs will want more advanced promotion criteria than manual approval. In particular, running an integration test on a test cluster is a best practice to confirm a service is ready to be promoted to the next stage. Plural pipelines can spawn those as part of the gates along a pipeline edge. Here's an example, modifying our existing `pipeline.yaml`:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: Pipeline
metadata:
  name: pr-automation
spec:
  stages:
    - name: dev
      services:
        - serviceRef:
            name: podinfo-dev
            namespace: infra
          criteria:
            prAutomationRef:
              name: podinfo-pipeline
    - name: prod
      services:
        - serviceRef:
            name: podinfo-prod
            namespace: infra
          criteria:
            prAutomationRef:
              name: podinfo-pipeline
  edges:
    - from: dev
      to: prod
      gates:
      - clusterRef:
          name: boot-staging # run on the staging cluster alongside the dev service
          namespace: infra
        name: integration tests
        spec:
          job:
            containers:
            - args:
              - /bin/sh
              - -c
              - echo "Hello, World!"
              - echo $TEST_ENV_VAR
              env: # can also add env vars as needed
              - name: TEST_ENV_VAR
                value: pipeline
              image: alpine:3.7
            labels:  # you can add job labels and annotations
              plural.sh/test-annotation: test
            annotations:
              plural.sh/test-annotation: test
            namespace: podinfo
            serviceAccount: default
        - name: approval-gate
          type: APPROVAL
```
