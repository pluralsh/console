---
title: PR Governance Controller
description: Unify Change Management Processes within a Git-standard Pull Request Model
---

# Motivation

Many enterprises require robust governance for all change management.  This is often done within blessed systems of record, with ServiceNow being the most common.  Plural lets you synchronize these processes with the GitOps-friendly pull request workflow offered by your SCM provider, using two main strategies:

1. ServiceNow - a dedicated controller implementation that synchronizes pull request and ServiceNow change request approvals and status
2. Webhook - a custom webhook for any nonstandard systems you might want to implement

In all cases, the flow has four main phases:

1. Open - a pull request is opened and a callback is made to the external system to create the change record
2. Confirm - the change record is polled on a jittered interval to determine whether it has been approved
3. Approval - Plural approves the pull request itself, using an SCM credential you specify
4. Close - the change record is closed once the pull request is merged or closed

## Managing PR Approval

This flow guarantees that pull requests cannot be merged without approval from the external system, but only if the SCM credential provided is made a required approver.  This can be done in a few different ways:

1. Repo-level configuration.  Many repos have global methods to require approvals from specific users and groups.
2. CODEOWNERS - a standard convention among Git providers that requires approvals from specific users or groups for specific file paths within a repo.

We recommend CODEOWNERS as it's more flexible.

## Tying a Pull Request to PR Governance

Most governance policies will be instantiated via CRD, like so:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: PrGovernance
metadata:
  name: example
spec:
  type: WEBHOOK
  connectionRef:
    name: governance # reference to the ScmConnection that is used for Pr approval
  configuration:
    webhook:
      url: https://my.governance.webhook
```

To allow the controller to work on a given PR, add the following text to its description:

```
Plural governance: example # replace {example} with whatever name you dedicate the governance controller to
```

As long as you have a webhook watching that repo (which can be created in the SCM management panel in Plural), we'll bind the PR to the controller named `example`.