---
title: Destroying the Cluster and Installations
description: How do I bring things down safely?
---

## Overview

Plural provides options to uninstall specific applications, tear down your clusters, and wipe any references to installations to start from zero. Uninstalling any Plural application or an entire Plural installation is a one-liner in your terminal or Cloud Shell. If you want to delete your Plural installation, make sure to run `plural destroy` before deleting your Git repository. If you delete your Git repository first, you will have to manually clean up all the resources that Plural has provisioned for you.&#x20;

## Purging the Cloud Shell

If you created a Plural installation in our Cloud Shell and want to move it to your local dev environment, you can sync your shell and delete the Cloud Shell instance from our servers. To sync your shell and delete your current Cloud Shell instance, use:

```
plural shell sync
plural shell purge
```

The purge command will destroy your current Cloud Shell instance, but preserve your existing cluster and installations. Your account will still be pinned to the same cloud provider chosen at the beginning of your onboarding.

## Uninstalling Individual Applications

To uninstall specific applications, use:

```
plural destroy <app-name>
```

This will do things like destroying terraform resources and emptying k8s namespaces, but it won't remove the application builds from your local repo, or the application configuration values from `context.yaml.`

## Uninstalling your Entire Installation

To uninstall your entire Plural installation and Kubernetes cluster, run:

```
plural destroy
```

{% callout severity="danger" %}
Only do this if you're absolutely sure you want to bring down all associated resources with this repository.
{% /callout %}

By default, previously installed applications will still appear in your [installed applications](https://app.plural.sh/installed) page on app.plural.sh after running `plural destroy`. To remove all installation history, run `plural repos reset` as documented below.

## Terraform Destroy

To tear down the current cluster but leave installation references as pointers to the Helm/Terraform, cd into `bootstrap/terraform` and run:

```
terraform destroy
```

## Remove Installation References

By default, app.plural.sh will retain your list of “installed apps”. After running `plural destroy`, if you also want to remove your installation history on app.plural.sh you can run:

```
plural repos reset
```

This command does not interact with any infrastructure, but removes references to all installations. This will also reset any association with a specific cloud provider.

## Fully Start Over

To tear down a cluster and fully start over, run `plural destroy` and then `plural repos reset`.
