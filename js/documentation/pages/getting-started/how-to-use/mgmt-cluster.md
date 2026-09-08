---
title: Provision a management cluster
description: Using Plural CLI to deploy a management (MGMT) Kubernetes cluster
---

# Overview

Plural's architecture, described {% doclink to="overview_architecture" %}here{% /doclink %} has two tiers:

* Management Cluster - a single management plane that will oversee the core responsibilities of fleet management: CD, terraform management, dashboarding, etc.
* Workload Cluster - a zoo of clusters you provision to run actual development and production workloads for your enterprise.

To get started with Plural, you need to provision your management cluster. There are two paths for this:

* Plural Cloud - a fully managed instance of the Plural Console.  We offer bother shared infrastructure hosting with usage limits and lower cost, or dedicated hosting which is more secure and enterprise-ready
* Self-Hosted - deploy and manage yourself on your own cloud environment, and we've provided a seamless getting started experience with `plural up` to do this.

## Plural Cloud (easiest)

Plural Cloud is a fully managed solution for provisioning Plural's core management software.  It will host the Plural Console, alongside its git cache, underlying postgres database, and the kubernetes-agent-server api.  To get started, create an account on <https://app.plural.sh> and go through the process for setting up your Plural Cloud instance.

There are two options, `shared` and `dedicated`.  
* A `shared` instance can be created on a free trial but has a hard cap on 10 clusters to use to avoid overloading other tenants.  
* `dedicated` cloud instances get a dedicated k8s cluster and database, and are built to scale effectively infinitely.  To use a `dedicated` instance, an enterprise plan is required, so please contact sales and we can get you set up as quickly as possible if that fits your use-case.

The UI should guide you through the entire process, once your console is up, you'll be greeted with a modal explaining how to finalize the onboarding.  You'll need to still create a small management cluster in your cloud to host the Plural operator and any cloud-specific secrets.  This is to ensure your cloud is fully secured and allow you to use Plural Cloud without exchanging root-level cloud permissions.  You'll do that by simply running:

```sh
plural up --cloud
```

Since it doesn't require setup of ingress controllers, SSL certs, etc, it's usually a very repeatable process.

{% callout severity="info" %}
Another benefit of the `plural up` command is it bootstraps an entire GitOps repo for you, making it much easier to get started with production-ready infrastructure than having to hand-code it all yourself
{% /callout %}

## `plural up` (still pretty easy)

`plural up` is a single command to spawn our management cluster from zero in any of the big three clouds (AWS, Azure, GCP).  We have docs thoroughly going over the process to use it {% doclink to="getting_started_first_steps_cli_quickstart" %}here{% /doclink %}.

There are a few reasons you'd consider using this over Plural Cloud:

* Security - you want to ensure Plural hosts absolutely no cloud-related permissions.  You can even follow our {% doclink to="getting_started_advanced_config_sandboxing" %}sandboxing guide{% /doclink %} to remove all egress to Plural (this requires an enterprise license key)
* Networking - you want to host the Plural Console on a private network entirely.  Plural Cloud currently is always publicly hosted.
* Integration - Oftentimes resources needed by Plural are themselves hosted on private networks, for instance Git Repositories.  In that case, it's logistically easier to self-host and place it in an integrated network. 
* Scaling - you want complete control as to how Plural Scales for your enterprise.  `dedicated` cloud hosting does this perfectly well too, but some orgs want their own hands on the wheel.

Plural is meant to be architecturally simple and efficient.  Most organizations that do choose to self-host are shocked at how streamlined managing it is, especially compared to some more bloated CNCF projects, so it is a surprisingly viable way to manage the software if that is what your organization desires.
