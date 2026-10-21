---
title: Continuous deployment
description: 'Manage a Kubernetes Fleet at Scale with Cluster API, or at your own pace'
---
## Overview

Plural has a fully featured operator for creating and managing all core resources within its API. This enables a complete GitOps flow, which opens up a few useful workflows for managing your resources:

- service-of-services patterns where you create a service syncing a folder of Plural service objects recursively, batching complex provisioning into one overarching resource.
- Renovate-based PR automation for basic Helm upgrades of underlying resources in your fleet
- full auditability of everything deployed, traced back to the Git repo itself.
- dropping deployment credentials from GitHub/GitLab/etc. CI systems, improving overall security posture.

This is in addition to other improvements Plural has made around scalability, e.g. with its Git caching layer and lazy, pull-based model sharding work efficiently into source clusters.

The operator itself is effectively a frontend: it automates the necessary API calls but does not directly manage the Kubernetes resources it's syncing or interact with workload clusters itself. This means it can be deployed virtually anywhere if needed for complex use cases, but it is usually deployed in the management cluster alongside Plural itself.
