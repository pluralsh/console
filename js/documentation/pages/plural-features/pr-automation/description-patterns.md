---
title: Description Patterns
description: Auto-Correlate Pull Requests with Resources in Plural
---

Plural supports several ways to correlate your pull requests with resources in Plural. These serve a variety of purposes:

1. Kick a Plural Service to minimize GitOps lag on merge.
2. Auto-generate Plural Stack plans for Terraform changes, improving the pull request review process.
3. Defer merges to off-hours to implement service windows.
4. Tie PRs to governance controllers.
5. Create preview environments.

{% callout severity="info" header="Ensure Webhook Present!" %}
In all of these cases, it's assumed you have an SCM webhook configured to provide Plural with an event stream for pull requests/merge requests from your SCM provider.  We support all major SCM providers, and webhooks are easy to set up at Self Service -> SCM Management.
{% /callout %}

We'll cover each of these one by one.

## PR <> Service Correlation

To tie a pull request to a service, add a tag like this to the pull request's description body:

```
Plural Service: {cluster-handle}/{service-name}
```

Once it's there, you'll be able to see the pull request in the service's details view in Plural, and once it's merged, Plural will automatically resync that service with its source of truth in Git, allowing for responsive deployment of the new configuration.

Without this tag, the ordinary GitOps sync window is roughly 2m with some jitter.

## PR <> Plural Stack Correlation

Plural Stacks can be tied to pull requests easily with:

```
Plural Stack: {stack-name}
```

This serves two main purposes:

1. As with services, PR merges will auto-kick the stack, ensuring it syncs the new changes from Git quickly.  Ordinarily, stacks follow a GitOps sync window like services, tuned to ~5m +- jitter by default.
2. Terraform plans can be generated and posted to pull requests as comments, which makes it much easier to safely review Terraform code based on the changes it implies against real infrastructure.

The plan will include:

1. The full Terraform plan result against the current state of the stack whenever a commit is made to the PR.
2. If Plural AI is enabled, an AI explanation of the plan and any risks it might pose, which is a nice additional review in case engineers are unfamiliar with the APIs involved.

## Plural merge cron

Plural can auto-merge a PR based on a crontab, assuming the following:

1. The PR is already approved
2. A `default` SCM connection has been registered within Plural to use.

It is activated with the following PR body tag:

```
Plural merge cron: */5 1,2 * * *
``` 

This will trigger Plural to attempt an auto-merge every 5 minutes from 1am-2am.  To ensure the PR is defer-merged, approve it before that window and Plural will merge it on your behalf.

## PR <> Plural Governance Correlation

To understand how PR governance works, we recommend reading the [governance docs](/plural-features/pr-automation/governance).  That said, tying a PR to a governance controller is simple:

```
Plural governance: {governance-name}
```

From there, the governance controller will go through its workflow of:

1. Create a change when the PR is opened.
2. Confirm the change is approved while the PR is open, and if so, approve the PR.
3. If the PR is closed or merged, close out the change with the appropriate status.

## PR -> Preview Environment Creation/Deletion

Plural Flows supports a full PR-based preview environment controller.  You can learn more about it in its [dedicated docs page](/plural-features/flows/preview-environment), but specifying one is simple:

```
Plural Flow: {flow-name}
Plural Preview: {preview-environment-template-name}
```

This will trigger preview environment creation based on the given template, which is unique to a Flow.  In particular, this will:

1. Clone an existing service on PR creation, and auto-update that service whenever the PR receives a push event.
2. Delete the service when the PR is deleted.