---
title: Architecture
description: Secure, Scalable Pull-Based Architecture
---

## Overview

Plural is based on a scalable, secure, agent-based pull architecture. It doesn't require direct access to any of the clusters it deploys to, meaning it can manage workloads in any cloud, on-prem, on the edge, or even on a local laptop running KIND. Further since it doesn't require networking intensive kubernetes watch streams, central access to kubernetes, or rely on single-mastered operator control loops, it should scale to virtually any size kubernetes fleet. We also enhance your kubernetes setup with an auth proxy, allowing you to have full visibility to your workloads without compromising the network security of your setup or require the creation of complex multi-cloud networking setups.

Here's a quick diagram of the setup:

![](/assets/deployments/architecture.png)

## Control Plane

The Control Plane layer is a full-stack service deployable onto any kubernetes cluster you designate as your management cluster. It contains a few main components:

- Horizontally scalable git cache - we should be able to ingest as many git repos as you'd like and auto-shard them throughout your cluster automatically and efficiently.
- Configuration Management - supports re-configurable backends, but allows you to easily parameterize services with information like hostnames, docker image tags, and other secret and non-secret information.
- Auth Proxy - this is a secure bidirectional grpc channel initiated by a deployment agent used to make kubernetes api calls no matter where a cluster may live and give you full dashboarding capabilities from the Plural UI.
- Cluster API Providers - Plural natively integrates with cluster api and allows you to create and manage new clusters at scale and fork your own kubernetes cluster APIs on top of existing setups for services like EKS, AKS and GKE or on-prem solutions like Rancher

We provide simple installers if you'd like to deploy the control plane layer to a kubernetes cluster already in your fleet, or you can use our own kubernetes setup in the standard plural install flow.

## Deployment Agent

A thin deployment agent is installed onto each cluster and perpetually managed by Plural from then on. It will perpetually poll the control plane for new services to apply and if there are any changes to make, apply them into your cluster. It also can do a few other things like:

- Establish the bi-directional grpc channel for the auth proxy layer (this does require an ingress with websocket support)
- Execute integration tests

There were a few design considerations involved in our agent that are worth understanding as well:

- The expectation is the agent is deployed independently at scale, potentially hundreds of times for a large organization, so it must be maximally simple to reduce operational complexity to near 0.
- It is designed to be extensible to arbitrarily many frameworks for defining kubernetes manifests. We aren't actually huge fans of helm or kustomize and want organizations to have the flexibility to ultimately use other toolchains for managing their kubernetes YAML codebase (or ultimately de-YAML themselves)

## Product Architecture

Plural splits infrastructure management into a simple hierarchy:

1. All infrastructure is owned by a `Project`.  This is both an organizational container and a permission boundary.  It can be useful for segregating permissions to large scopes of resources.
2. Projects can own either `Stacks` or `Clusters`.  Stacks are basically IaC codebases, and can encapsulate any base cloud infrastructure defined via Terraform or some other framework.  Clusters are simply running Kubernetes clusters.
3. Clusters can own `Services` which are GitOps constructs syncing kubernetes YAML into those clusters.

Along this hierarchy, any permission attached to a parent resource is communicated down.  So if a user has write access to a `Cluster`, that user also has write access to the cluster's `Service` objects.

The hierarchy can be represented like so:

{% mermaid %}
graph TD
  Project["Project"]
  Stack["Stack (Terraform)"]
  Cluster["Cluster (Kubernetes)"]
  Service["Service (GitOps Construct)"]

  Project --> Stack
  Project --> Cluster
  Cluster --> Service
{% /mermaid %}

