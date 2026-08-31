---
title: Continuous deployment
description: 'Manage a Kubernetes Fleet at Scale with Cluster API, or at your own pace'
---
## Overview

Plural has a fully featured operator for creating and managing all core resources within its api. This enables a complete GitOps flow, which opens has a few nice workflows for managing your resources:

- service-of-service patterns where you create a service syncing a folder of plural service objects recursively, batching complex provisioning into one overarching resource.
- renovate-based pr automation for basic helm upgrades of underlying resources in your fleet
- full auditability of everything deployed referenced to the git repo itself.
- dropping deployment credentials from Github/Gitlab/etc CI systems, improving overall security posture.

This is in addition to other improvements Plural has made around scalability, e.g. with its git caching layer and lazy, pull based model sharding work efficiently into source clusters.

The operator itself is effectively just a frontend, automating the process to make the necessary api calls but not directly managing the kubernetes resources its syncing or directly interacting with workload clusters itself. This means it can be deployed effectively anywhere if that's needed for some complex usecases, but usually is deployed in the management cluster alongside plural itself.
