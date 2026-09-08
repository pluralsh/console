---
title: Host Your Plural Console with Plural Cloud
description: Let us manage your Plural instance, and connect it to Kubernetes clusters running in your Cloud
---

## Overview

Plural Cloud provides a hybrid deployment model where we take over management of the Plural control plane, including its DB, high availability and other operational requirements, and you register clusters in your cloud to be remotely operated.  The Plural cloud instance works the same as any other Plural instance, described in our [Architecture overview](/overview/architecture).  Plural cloud also supports two main tenancy modes:

* Shared - your cloud instance is hosted on a set of shared k8s clusters and shared postgres servers for minimal cost
* Dedicated - your cloud instance gets a dedicated k8s cluster and database, allowing maximal scalability and isolating your data fully from other tenants

One key differentiated aspect of the hybrid Plural architecture is we can manage infrastructure *in your cloud* without requiring us to *store your keys on our servers*.  This is due to the fact that the Plural control plane stores all declarative state of what needs to be deployed, but the actual action is performed by our agent that runs in either the management cluster or the leaf clusters you'll create in your cloud environment.  Those clusters are usually wired with best practice cloud IAM solutions like EKS IRSA or GKE Workload Identity.

In addition, Plural Cloud comes with these key integrations built in by default:

* Log aggregation - ultimately persisted to elasticsearch and hosted by us with logstash preconfigured
* Scale-out Prometheus - fully compliant prometheus api, again hosted by us, with vmetrics agent preconfgured by us
* AI - we automatically provide a working ai endpoint for your environment
* Github Integration - you can simply install our Github App and immediately use Plural to generate PRs and other SCM-related tasks

These are not terribly hard to provision in our self-hosted version either, but they do need to be managed by the user in each case.

# Setup

The Cloud setup flow is relatively straightforward, go to `https://app.plural.sh/create-cluster` and fill out a wizard that looks like:

![](/assets/getting-started/cloud-start.png)

Once you select Plural Cloud, you'll see a wizard like the below:

![](/assets/getting-started/cloud-wizard.png)


After filling out the wizard, it'll take about 2-3 minutes to instantiate your cluster, from there, you can log into your Plural Cloud instance, and connect it to your Github and AWS/GCP/Azure infrastructure.

## Setup Wizard

After logging in, you should be presented with a wizard something like this:

![](/assets/plural-cloud/wizard.png)

The setup wizard will cover three main things:

* Setting up a connection to your SCM provider.  The default is to install our Github App, which is the easiest overall flow, but you can provide an access token manually as well.
* Setting up a webhook against your SCM provider.  This is used to gather statuses of PRs and for the [Pull Request Workflow](/plural-features/stacks-iac-management/pr-workflow) for Plural Stacks.  It is optional and you can skip it if your access token or app install wasn't granted the necessary permissions.
* instructing your to run `plural up --cloud` to set up your initial management cluster.

## The "plural up --cloud" command

The `plural up --cloud` command will initialize a git repository and run a sequence of terraform commands to connect your cloud environment to Plural cloud. In particular, it will:

* Set up an initial GitOps repo with our default, production ready configurations.  This includes a ton of useful stuff, including:
    - initializes a service-of-services structure to set up full GitOps management
    - initializes the Plural Service Catalog, with quick deployments and configuration of a lot of useful tools, like a dev + prod eks fleet, elasticsearch for logging, scale out prometheus with victoria metrics, and Grafana backed by RDS
    - is the assumed repo structure for the [How to Use Plural Guide](/getting-started/how-to-use)
* Set up a minimal management EKS Cluster.  This is there primarily so Plural Cloud can operate without requiring you to send us any cloud credentials to our servers.


The terraform and scripting should be entirely self-contained, and should take about 10 or so minutes to run to completion (can be longer for AWS).  It's also worth noting that the cloud and region for `plural up --cloud` can be different than the one used for your Plural instance, your infrastructure is entirely self contained.  We also never ingress to your environment nor capture your cloud keys, a core aspect of the Plural Cloud architecture.

## Cleaning Up Your Environment

If you were simply testing and want to clean up your environment there are basically two steps:

* Remove any infrastructure managed by Plural.  This should involve:
  * Delete the Plural Stacks you set up.  **Be sure to do this via a GitOps process, not the UI, as our operator will recreate the stack if you do not**.
  * Delete the services that might also spawn resources, especially those that create load balancers.
  * This is often doable by simply reverting the PRs we generate to provision that infra.
* from there run `plural down --cloud`.

{% callout severity="warn" %}
There are two main gotchas to be aware of:

* You must run `plural down --cloud` if you're connected via Plural cloud, otherwise there's a `plural_cluster` resource that needs to be manually removed from tf state.
* If you do not properly clean up the resources Plural created before deleting your management cluster with `plural down --cloud`, **you will have dangling resources that need to be manually deleted.**  Plural actually does a great job of being able to destroy resources, but it is up to the user to know what they created and what they need to delete.
{% /callout %}

## Next Steps

We strongly recommend your check out our [How To Guide](/getting-started/how-to-use) once your Console is set up, as it'll get you acquainted with a ton of the features of Plural.