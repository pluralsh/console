---
title: PR Governance Controller
description: Unify Change Management Processes within a Git-standard Pull Request Model
---

# Motivation

Many enterprises require robust governance for all change management.  This is oftentimes done within blessed systems-of-record, with ServiceNow being the most frequently common.  Plural allows for you to synchronize these processes with the GitOps-friendly pull request workflow offered by your SCM provider, using two main strategies:

1. ServiceNow - dedicated controller implementation to synchronize pull request and ServiceNow change request approvals and status
2. Webhook - custom webhook for any nonstandard systems you might want to implement.

In all cases the flow has three main phases:

1. Open - a pull request is opened and a callback is initiated to the external system to create the change record
2. Confirm - the change record is polled on a jittered interval to determine whether the change record has been approved
3. Approval - Plural will approve the Pull Request itself, using a SCM credential you specify
4. Close - The change record is closed once the Pull Request is merged or closed

## Managing PR Approval

This flow guarantees pull requests cannot be merged unless dictated by the external system if and only if the SCM credential provided is made a required approver.  This can be done in a few different ways:

1. Repo level configuration.  Many repos have global methods to require approvals from specific users and groups.
2. CODEOWNERS - this is a standard convention within Git providers, which delegates specific file paths within a repo to require approvals within users or groups.

We recomend CODEOWNERS as it's more flexible.

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

To allow the controller to work on a given pr, you simply need to add the following text to its PR description:

```
Plural governance: example # replace {example} with whatever name you dedicate the governance controller to
```

As long as you have a webhook watching that repo (can be created in the SCM management panel in Plural), we'll dedicate and bind the pr to the controller named `example`.