---
title: Architecture
description: Secure, Scalable Pull-Based Architecture
---

## Overview

Plural is based on a scalable, secure, agent-based pull architecture. It doesn't require direct access to any of the clusters it deploys to, meaning it can manage workloads in any cloud, on-prem, on the edge, or even on a local laptop running KIND. Further, since it doesn't require network-intensive Kubernetes watch streams or central access to Kubernetes, and doesn't rely on single-mastered operator control loops, it should scale to a Kubernetes fleet of virtually any size. We also enhance your Kubernetes setup with an auth proxy, giving you full visibility into your workloads without compromising the network security of your setup or requiring complex multi-cloud networking.

Here's a quick diagram of the setup:

![](/assets/deployments/architecture.png)

## Control Plane

The Control Plane layer is a full-stack service deployable onto any Kubernetes cluster you designate as your management cluster. It contains a few main components:

- Horizontally scalable Git cache - we should be able to ingest as many Git repos as you'd like and auto-shard them throughout your cluster efficiently.
- Configuration Management - supports re-configurable backends, and allows you to easily parameterize services with information like hostnames, Docker image tags, and other secret and non-secret information.
- Auth Proxy - a secure bidirectional gRPC channel, initiated by a deployment agent, used to make Kubernetes API calls no matter where a cluster lives and to give you full dashboarding capabilities from the Plural UI.
- Cluster API Providers - Plural natively integrates with Cluster API, allowing you to create and manage new clusters at scale and fork your own Kubernetes cluster APIs on top of existing setups for services like EKS, AKS and GKE or on-prem solutions like Rancher.

We provide simple installers if you'd like to deploy the control plane layer to a Kubernetes cluster already in your fleet, or you can use our own Kubernetes setup in the standard Plural install flow.

## Deployment Agent

A thin deployment agent is installed onto each cluster and managed by Plural from then on. It continuously polls the control plane for new services and, if there are any changes to make, applies them to your cluster. It can also do a few other things, like:

- Establish the bidirectional gRPC channel for the auth proxy layer (this does require an ingress with websocket support)
- Execute integration tests

There were a few design considerations involved in our agent that are worth understanding as well:

- The expectation is that the agent is deployed independently at scale, potentially hundreds of times for a large organization, so it must be maximally simple to reduce operational complexity to near zero.
- It is designed to be extensible to arbitrarily many frameworks for defining Kubernetes manifests. We aren't huge fans of Helm or Kustomize and want organizations to have the flexibility to use other toolchains for managing their Kubernetes YAML codebase (or ultimately de-YAML themselves).

## Product Architecture

Plural splits infrastructure management into a simple hierarchy:

1. All infrastructure is owned by a `Project`.  This is both an organizational container and a permission boundary.  It can be useful for segregating permissions to large scopes of resources.
2. Projects can own either `Stacks` or `Clusters`.  Stacks are IaC codebases, and can encapsulate any base cloud infrastructure defined via Terraform or some other framework.  Clusters are running Kubernetes clusters.
3. Clusters can own `Services`, which are GitOps constructs syncing Kubernetes YAML into those clusters.

Along this hierarchy, any permission attached to a parent resource is inherited by its children.  So if a user has write access to a `Cluster`, that user also has write access to the cluster's `Service` objects.

The hierarchy can be represented like so:

{% hierarchy label="Ownership · permissions flow down" %}
{% hierarchy-node depth=0 name="Project" detail="organizational container · permission boundary" /%}
{% hierarchy-node depth=1 name="Stack" detail="IaC · Terraform · Pulumi · Ansible" /%}
{% hierarchy-node depth=1 name="Cluster" detail="Kubernetes · EKS · AKS · GKE · k3s · on-prem" /%}
{% hierarchy-node depth=2 name="Service" detail="GitOps · Helm · Kustomize · YAML" /%}
{% /hierarchy %}

