---
title: Destroy the Cluster Safely
description: Drain and Remove your Clusters
---

## Deletion Models

Plural supports two deletion models:

- drain - this will first delete all services in Plural before finally proceeding to deregister the cluster if BYOK or destroy it via Cluster API if it was a cluster api cluster
- soft - this will leave all the services in-place and simply remove the reference to the cluster in our system. You'll want to manually uninstall the agent in that cluster as well. This is meant primarily for BYOK clusters.

Before deleting your cluster, you should decide on which you'd prefer to do, if it's a full deletion, we'd recommend draining as it will ensure all load balancers/volumes are swept up upon cluster deletion

## Delete a cluster In-Browser

In the cluster list, you can delete a cluster by clicking the trash icon next to it. This will open a confirmation modal and if chosen, will proceed with deletion.

## Delete a cluster via cli

You can delete a cluster with the cli using:

```sh
plural cd clusters delete @<handle>
```
