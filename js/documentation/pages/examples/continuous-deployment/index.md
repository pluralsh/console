---
title: Continuous deployment
description: 'Learn how to deploy applications using Helm charts, Kustomize, and Git-based Kubernetes resources with advanced orchestration capabilities'
---

## Overview

This section provides practical examples of using Plural's Continuous Deployment feature to easily install and manage
applications in your Kubernetes clusters. Plural is a comprehensive platform that simplifies infrastructure management for
DevOps teams and developers.

These examples demonstrate how Plural can help you:

- **Deploy Applications Flexibly**: Use Helm charts with either inline values for simplicity or external values files for better organization of complex configurations
- **Provision Infrastructure**: Create and manage your entire infrastructure stack including Kubernetes clusters, databases, and cloud resources using Infrastructure Stacks powered by Terraform and Ansible
- **Enhance Kubernetes Deployments**: Apply Liquid templating to customize Helm values and raw Kubernetes manifests
- **Build Connected Services**: Create services with proper dependencies and orchestration between components
- **Implement GitOps Workflows**: Manage multi-environment deployments (like dev → staging → production) with clear separation and controlled promotion between environments
- **Automate Updates**: Leverage pipeline observers to automatically generate pull requests when new versions of your applications are available

Plural brings these capabilities together in a unified platform that combines the best practices of GitOps with powerful deployment tools that work across any infrastructure. The examples in this section will guide you through practical implementations that you can adapt to your own projects.

All files used in the provided examples can be found in our
[scaffolds](https://github.com/pluralsh/scaffolds/tree/main/examples) repository.

## Prerequisites
Before you begin, make sure you have:
- A Plural cluster set up with continuous deployment (CD) enabled
- A Git repository connected to your Plural setup (this is where we'll store our configuration files)
- Plural Console running on your cluster (this is the web interface we'll use to monitor our deployment)

If you're missing any of these, please refer to the [First Steps guide](../../getting-started/first-steps) to set up your environment.

## Setup
For simplicity, all examples in this guide use the `mgmt` cluster as the deployment target and a main infrastructure repository (initially created during Plural bootstrapping with `plural up`) to store the configuration. Before proceeding, create the required `Cluster` and `GitRepository` resources that will be shared across all examples.

### Create a read-only cluster resource
First, we'll create and adopt a cluster that will serve as the target for our examples. While the `mgmt` cluster typically exists in the `infra` namespace, we can adopt additional read-only clusters through our custom resources as needed

##### [apps/examples/cluster.yaml](#TODO)
```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: Cluster
metadata:
  name: mgmt
  namespace: examples
spec:
  # providing only a handle allows us to adopt the existing cluster
  handle: mgmt
```

### Create a GitRepository resource
Next, create a GitRepository resource to access files you'll commit while working through these examples.

##### [apps/examples/gitrepository.yaml](#TODO)
```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: GitRepository
metadata:
  name: example
  namespace: examples
spec:
  # This can point to your main infra repository used by the Plural CD engine
  # or to a different one. It will be used to store helm values file for our service.
  url: git@github.com:<your_example_repository>.git
```