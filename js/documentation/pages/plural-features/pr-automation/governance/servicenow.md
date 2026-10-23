---
title: ServiceNow Governance
description: Dedicated PR <-> Change Request Sync into ServiceNow
---

The ServiceNow governance controller allows a pull request to be synchronized with a ServiceNow change request, so enterprises can implement GitOps flexibly without sacrificing the auditing and governance posture they've built around the ServiceNow ecosystem.  Before implementing, it's worth briefly looking through the [docs on PR governance](/plural-features/pr-automation/governance) to familiarize yourself with the model.

{% callout severity="info" header="Ensure Webhook Present!" %}
For this to work, it's assumed you have an SCM webhook configured to provide Plural with an event stream for pull requests/merge requests from your SCM provider.  We support all major SCM providers, and webhooks are easy to set up at Self Service -> SCM Management.  Most SCM providers also have ways to limit the scope of webhook events to individual repository sets in case it cannot be implemented organization-wide.
{% /callout %}

# Defining a PrGovernance CRD

The Governance CRD using ServiceNow is relatively straightforward. Here's an example:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: PrGovernance
metadata:
  name: snow
spec:
  type: SERVICE_NOW
  connectionRef:
    name: governance # reference to the ScmConnection that is used for Pr approval
  configuration:
    serviceNow:
      url: https://instance.service-now.com
      username: my-user
      passwordSecretKeyRef:
        name: snow-creds
        key: password
      secretNamespace: infra # wherever the `snow-creds` secret lives

      # supports the ITIL4 change models, eg Standard, Normal, Emergency
      changeModel: Standard
      
      # any specific attributes you want to include in the change request, we'll auto-infer the required fields (description, short description, backout plan, test plan, implementation plan from the pull request itself if not provided)
      attributes:
        description: some description
```

From there, to tie it to a pull request, you'll need:

1. An SCM webhook for the repository pointing to Plural (this can be created in Self Service -> SCM Management in your Plural Console instance).
2. The `Plural governance: snow` tag in your PR description, so that we identify it as requiring governance.

# ServiceNow Controller Implementation

The ServiceNow controller will do the following once it is tied to a PR:

1. Create a new ServiceNow change request using the REST API, filling in any blank fields by inspecting the PR and generating them with AI if not provided (this is overridable and meant to minimize required, brittle implementation).
2. Wait for the change to be moved to the 'Scheduled' (or later) state in ServiceNow, then approve the pull request and move the change to `Implement` state.
3. Once the PR is merged, the change is moved to `Close` state and marked successful, with the reason that the pull request was merged.
4. If the PR is ever closed, the change request is moved to `Cancelled` state.

Here's a state diagram for the visually inclined as well:

{% mermaid %}
stateDiagram-v2
    [\*] --> PRCreate : PR tied to governance
    state PRCreate : PR created with governance tag
    PRCreate --> ChangeCreated : Create change request in ServiceNow
    state ChangeCreated : Create change via REST API, fill blanks from PR/AI if needed
    ChangeCreated --> WaitingForScheduled : Change in ServiceNow
    state WaitingForScheduled : Wait for change to reach Scheduled (or later)
    WaitingForScheduled --> Implementing : Change is Scheduled, approve PR, move to Implement
    state Implementing : Change in Implement state
    Implementing --> Closed : PR merged
    state Closed : Move change to Close, mark successful
    PRCreate --> Cancelled : PR closed
    ChangeCreated --> Cancelled : PR closed
    WaitingForScheduled --> Cancelled : PR closed
    Implementing --> Cancelled : PR closed
    state Cancelled : Change request moved to Cancelled state
    Closed --> [\*]
    Cancelled --> [\*]
{% /mermaid %}

# Requiring ServiceNow Approvals before PR Approval

This is achieved in the following way:

1. Set the `changeModel` to Normal, which requires the ServiceNow change to go through CAB approval before being moved to `Scheduled` state.
2. Ensure the governance SCM connection is a required approver on the PR.  This will block merges of the PR until the governance controller sees the ServiceNow approval. 

