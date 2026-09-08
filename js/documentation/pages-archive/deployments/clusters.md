---
title: Cluster Management
description: Manage a Kubernetes Fleet at Scale with Cluster API, or at your own pace
---

## Overview

Plural supports creation and management of new clusters using [Cluster API](https://cluster-api.sigs.k8s.io/). This provides a full kubernetes control loop for creating, upgrading and deleting kubernetes clusters, with the ability to declaratively define your cluster topology using Cluster CRDs. We've found operating kubernetes using standard toolchains have underappreciated error patterns, and CAPI can help resolve these issues. It also allows you to create a reusable, declarative api for your companies own flavor of Kubernetes, ultimately backed by familiar services like EKS, AKS, or GKE, or if you're running on-prem, solutions like Rancher or OpenStack.

That said we also support [importing](/deployments/import-cluster) clusters you manage yourself, no matter where they might live by installing our agent and registering it with our apis. The CAPI pattern might be good for you if you have a few of these needs though:

- need a fully repeatable way to provision new kubernetes environments
- are operating in multi-cloud environments, and want a unified kubernetes management plane
- are operating on-prem and want a robust kubernetes provisioner (talk with us if this is your usecase and we can help)
- want to have the ability to spin up ephemeral kubernetes clusters and gracefully spin them down

If you're interested, you can find more information on our website at [https://www.plural.sh/plural-deployments-early-access](https://www.plural.sh/plural-deployments-early-access).
