---
title: Kubernetes APIs
description: >-
    Documentation about the main Plural Kubernetes custom resource sets, split between agent and management cluster
---

# Kubernetes APIs

Plural provides two main Kubernetes APIs:

* Management API - This is the core api usually only available on your management cluster.  It allows you to register new deployments across your fleet, register Plural Stacks, and more.
* Agent API - this is the API the Plural deployment operator (agent) exposes.  This will be available on all clusters, and exposes a number of utility capabilities.

Some quick hits to be aware of for each of these apis.

## Management API

The main aspects of the Plural Management API supports our main product categories: CD, Stacks (IaC Management), SCM Management (pr automation, etc), and AI

1. For CD, you'll want to learn about `ServiceDeployment`, `GitRepository`, `Cluster`, `GlobalService`, `Pipeline` and more.
2. For Stacks, the key api is `InfrastructureStack`
3. For SCM Management, the key api is `PrAutomation`, but you also should understand `ScmConnection` as its needed to tie authentication to a pr automation.
4. AI is primarily zero-configuration.  That said, you can reconfigure it using our `DeploymentSettings` api

## Agent API

There are a few useful APIs here, in particular:

1. `ClusterDrain` - a configurable, safe pod drain across deployments/daemonsets in a cluster to assist in building b/g cluster upgrades
2. `AgentRuntime` - register a cluster as an agent run cluster, to execute claude code or other coding agents (default off).
3. `AgentConfiguration` - allows you to tune our agent, including things like CD reconciliation intervals, stack poll intervals, configuring image vendoring and more.