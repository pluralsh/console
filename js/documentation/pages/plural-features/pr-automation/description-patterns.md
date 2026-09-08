---
title: Description Patterns
description: Auto-Correlate Pull Requests with Resources in Plural
---

Plural Supports a number of ways to correlate your Pull Request with resources in Plural, these can serve a variety of purposes:

1. Kick a Plural Service, to minimize GitOps lag on merge.
2. Auto-generate Plural Stack plans for terraform changes, improving the pull request review process.
3. Deferring merges to off-hours to implement service windows.
4. Tie PRs to governance controllers
5. Preview Environment Creation

{% callout severity="info" header="Ensure Webhook Present!" %}
In all of these cases, it's assumed you have an SCM webhook configured to provide Plural with an event stream for pull request/merge requests from you SCM provider.  We support all major SCM providers, and they're easy to set up at Self Service -> SCM Management.
{% /callout %}

We'll list these all out one-by-one

## PR <> Service Correlation

To tie a pull request to a service, simply add a tag like this to the pull requests description body:

```
Plural Service: {cluster-handle}/{service-name}
```

to your pull request body.  Once there, you'll be able to see the pull request in the service's details view in Plural, and once merged, Plural will automatically resync that service with its source of truth in git, allowing for responsive deployment of the new configuration.

If this isn't implemented, the ordinary GitOps sync window is something like ~2m with some jitter

## PR <> Plural Stack Correlation

Plural Stacks can be tied to pull requests easily with:

```
Plural Stack: {stack-name}
```

This serves two main purposes:

1. Like with services, pr merges will auto-kick the stack, ensuring they sync the new changes with git quickly.  Ordinarily these follow a gitops sync window like with services, tuned to ~5m +- jitter by default.
2. Allows for terraform plans to be generated and posted to pull requests as comments, this makes it much easier to safely review terraform code based on the changes it implies against real infrastructure.

The plan will include:

1. The full terraform plan result against the current state of the stack whenever a commit is made to the PR
2. If Plural AI is enabled, an ai explanation of the plan, and any risks it might pose, which is a nice additional review in case engineers are unfamiliar with the APIs involved.

## Plural merge cron

Plural has the ability to auto-merge a PR based on a crontab, assuming the following:

1. The PR is already approved
2. A `default` SCM connection has been registered within Plural to use.

It is activated with the following PR body tag:

```
Plural merge cron: */5 1,2 * * *
``` 

This will trigger Plural to attempt auto-merge from 1am-2am every 5 minutes.  To ensure the PR is defer-merged, approve it before that window and Plural will merge it on your behalf.

## PR <> Plural Governance Correlation

To understand how PR governance works, I recommend reading the [docs themselves](/plural-features/pr-automation/governance).  That said, tying a PR to a governance controller is simple:

```
Plural governance: {governance-name}
```

From there, the governance controller will go through its workflow of:

1. create a change on PR open
2. confirm the change is approved while the PR is open, and if so, approve the PR
3. If the PR is closed or merged, close out the change with the appropriate status.

## PR -> Preview Environment Creation/Deletion

Plural Flows supports a full PR-based preview environment controller.  You can learn more about it in its [dedicated docs page](/plural-features/flows/preview-environment), but specifying one is simple:

```
Plural Flow: {flow-name}
Plural Preview: {preview-environment-template-name}
```

This will trigger preview environment creation based on the given template, which is unique to a Flow.  In particular this will:

1. Clone an existing service on PR creation, and auto-updates that service whenever the PR receives a push event.
2. Delete the service when the PR is deleted.