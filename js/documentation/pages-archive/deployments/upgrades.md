---
title: Upgrades and Rollbacks
description: Change versions of deployed services
---

## Upgrades

Plural will track new revisions for a service when the underlying Git repo or configured secrets are changed. When PRs are merged to the tracked branch in Git, the service will be updated after the next pull. Modifying secrets will also trigger an update.

## Rollbacks

To roll a service back to a prior revision, you can either select the Rollback icon from the deployments table or the Revisions tab from the Service details page.

The current revision will be marked with a purple checkmark. Choose a version and select "Roll back" to revert.

![](/assets/deployments/rollback.png)
