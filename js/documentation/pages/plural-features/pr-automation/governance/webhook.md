---
title: Custom Webhook Governance
description: Implementing Webhook Based Custom Governance Controllers
---

Some enterprise require bespoke governance, either because they are not standardized on ServiceNow or because they leverage it in a unique, tailor-built way.  Plural allows you to bridge that gap with a simple webhook based protocol. Before implementing, it's worth just looking through the [docs on PR governance](/plural-features/pr-automation/governance) briefly to familiarize yourself with the model.

{% callout severity="info" header="Ensure Webhook Present!" %}
For this to work, it's assumed you have an SCM webhook configured to provide Plural with an event stream for pull request/merge requests from you SCM provider.  We support all major SCM providers, and they're easy to set up at Self Service -> SCM Management.  Most SCM providers also have ways to limit the scope of webhook events to individual repository sets in case it cannot be implemented organization-wide.
{% /callout %}

# Defining a PrGovernance CRD

The Governance CRD utilizing SericeNow is relatively straightforward, here's an example:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: PrGovernance
metadata:
  name: webhook
spec:
  type: WEBHOOK
  connectionRef:
    name: governance # reference to the ScmConnection that is used for Pr approval
  configuration:
    webhook:
      url: https://governance-webhook.acme.com
```


{% callout severity="info" %}
At the moment, this is only feasible on self-hosted instances of Plural
{% /callout %}

From there, to tie it to a pull request, you'll need:

1. To ensure there's a SCM webhook for the repository pointing to Plural (this can be created in Self Service -> SCM Management in you Plural Console instance)
2. Add the `Plural governance: webhook` tag to your PR description so that we'll identify it as requiring governance.

# Webhook Controller Implementation

The webhook expects three REST-like APIs to be present:

* POST /v1/open - called when a PR is created
* POST /v1/confirm - called when a PR is open, and will allow auto-approval if it returns 200
* POST /v1/close - called once a PR is merged or closed, and allows your implementation to cleanup any needed resources 

Throughout the request flow, we will persist the results from prior calls as state, and provide a JSON-encoded request body in the following format:

```typescript
{
    "state": any | null,
    "pr": {
        "id": string,
        "title": string,
        "body": string,
        "ref": string,
        "url": string,
        "status": "open" | "closed" | "merged",
        "labels": string[]
    }
}
```

The webhook controller will do the following once it is tied to a PR:

1. On PR open, call `POST /v1/open`
2. While the PR is open, periodically call `POST /v1/confirm` with the body from the prior call to `/v1/open` provided in the `state` field above.
3. If `/v1/confirm` returns 200, the pull request is approved.
4. Once the pull request is merged or closed, a call to `POST /v1/close` is made.

Here's a state diagram for the visually inclined as well:

{% mermaid %}
stateDiagram-v2
    [\*] --> PRCreate : PR tied to governance
    state PRCreate : PR opened with governance tag
    PRCreate --> OpenSent : Call POST /v1/open
    state OpenSent : Response persisted for later calls
    OpenSent --> WaitingForConfirm : Periodically call POST /v1/confirm with state
    state WaitingForConfirm : Poll until 200 or PR merged/closed
    WaitingForConfirm --> Approved : /v1/confirm returns 200
    state Approved : Pull request is approved
    OpenSent --> Closed : PR merged or closed
    WaitingForConfirm --> Closed : PR merged or closed
    Approved --> Closed : PR merged or closed
    Closed --> Cleanup : POST /v1/close with final state for cleanup
    Cleanup --> [\*]
{% /mermaid %}

{% callout severity="info" %}
For this to gate pull request merges appropriately, you'll need to ensure the SCM credential given to the governance controller is a required approver of the repository or at least a CODEOWNER of the files that are being changed  
{% /callout %}