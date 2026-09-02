---
title: Creating your own catalog
description: Defining your own service catalogs with Plural
---

## Overview

{% callout severity="info" %}
TLDR: skip to {% doclink to="plural_features_service_catalog_creation" %}Examples{% /doclink %} to see a link to our Github repository with our full default catalog for working examples
{% /callout %}

Plural Service Catalogs are ultimately driven off of two kubernetes custom resources: `Catalog` and `PrAutomation`.  Here are examples of both:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: Catalog
metadata:
  name: data-engineering
spec:
  name: data-engineering
  category: data
  icon: https://docs.plural.sh/favicon-128.png
  author: Plural
  description: |
    Sets up OSS data infrastructure using Plural
  bindings:
    create:
    - groupName: developers # controls who can spawn prs from this catalog
```

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: PrAutomation
metadata:
  name: airbyte
spec:
  name: airbyte
  icon: https://plural-assets.s3.us-east-2.amazonaws.com/uploads/repos/d79a69b7-dfcd-480a-a51d-518865fd6e7c/airbyte.png
  identifier: mgmt
  documentation: |
    Sets up an airbyte instance for a given cloud
  creates:
    git:
      ref: sebastian/prod-2981-set-up-catalog-pipeline # TODO set to main
      folder: catalogs/data/airbyte
    templates:
    - source: helm
      destination: helm/airbyte/{{ context.cluster }}
      external: true
    - source: services/oauth-proxy-ingress.yaml.liquid
      destination: services/apps/airbyte/oauth-proxy-ingress.yaml.liquid
      external: true
    - source: "terraform/{{ context.cloud }}"
      destination: "terraform/apps/airbyte/{{ context.cluster }}"
      external: true
    - source: airbyte-raw-servicedeployment.yaml
      destination: "bootstrap/apps/airbyte/{{ context.cluster }}/airbyte-raw-servicedeployment.yaml"
      external: true
    - source: airbyte-servicedeployment.yaml
      destination: "bootstrap/apps/airbyte/{{ context.cluster }}/airbyte-servicedeployment.yaml"
      external: true
    - source: airbyte-stack.yaml
      destination: "bootstrap/apps/airbyte/{{ context.cluster }}/airbyte-stack.yaml"
      external: true
    - source: oauth-proxy-config-servicedeployment.yaml
      destination: "bootstrap/apps/airbyte/{{ context.cluster }}/oauth-proxy-config-servicedeployment.yaml"
      external: true
    - source: README.md
      destination: documentation/airbyte/README.md
      external: true
  repositoryRef:
    name: scaffolds
  catalogRef: # <-- NOTE this references the Catalog CRD
    name: data-engineering
  scmConnectionRef:
    name: plural  
  title: "Setting up airbyte on cluster {{ context.cluster }} for {{ context.cloud }}"
  message: |
    Set up airbyte on {{ context.cluster }} ({{ context.cloud }})

    Will set up an airbyte deployment, including object storage and postgres setup
  configuration:
  - name: cluster
    type: STRING
    documentation: Handle of the cluster you want to deploy airbyte to.
  - name: stackCluster
    type: STRING
    documentation: Handle of the cluster used to run Infrastructure Stacks for provisioning the infrastructure. Defaults to the management cluster.
    default: mgmt
  - name: cloud
    type: ENUM
    documentation: Cloud provider you want to deploy airbyte to.
    values:
    - aws
  - name: bucket
    type: STRING
    documentation: The name of the S3/GCS/Azure Blob bucket you'll use for airbyte logs. This must be globally unique.
  - name: hostname
    type: STRING
    documentation: The DNS name you'll host airbyte under.
  - name: region
    type: STRING
    documentation: The cloud provider region you're going to use to deploy cloud resources.
```

A catalog is a container for many PRAutomations which themselves control the code-generation to accomplish the provisioning task being implemented.  In this case, we're provisioning [Airbyte](https://airbyte.com/).  The real work is being done in the referenced templates.

## Examples

The best way to get some inspiration on how to write your own templates is to look through some examples, and that's why we've made our default service catalog open source.  You can browse it here:

https://github.com/pluralsh/scaffolds/tree/main/setup/catalogs
