---
title: The deployment operator
description: The Plural deployment agent on workload clusters
---

The **deployment operator** (deployment agent) is a thin controller installed on each workload cluster in your fleet. It polls the Console for services to apply, runs stack and sentinel jobs locally, maintains the auth-proxy websocket when enabled, and reconciles agent-scoped CRDs on that cluster.

This is distinct from the [management controller](/plural-features/continuous-deployment/management-controller), which runs only on your management cluster and registers fleet-wide resources with the Console.

## Agent configuration

Per-cluster tuning — poll intervals, concurrency limits, image registry overrides for job pods, and websocket behavior — is configured with the cluster-scoped `AgentConfiguration` CRD. See [AgentConfiguration](agent-configuration) for the required singleton name and full spec reference.

Global settings that affect the entire fleet (including default agent helm values) are configured on the management cluster via [DeploymentSettings](/plural-features/continuous-deployment/management-controller/deployment-settings).

## API reference

Agent-scoped CRDs are documented in the {% doclink to="overview_agent_api_reference" %}Agent API Reference{% /doclink %}. Go types live in the [deployment-operator API](https://github.com/pluralsh/console/tree/master/go/deployment-operator/api/v1alpha1).

## Full working example

The `plural up` command is the simplest way to generate a full repository from the ground up. It includes terraform for the management cluster, workload clusters, and bootstrap manifests for both the management controller and deployment agents. A public reference is available in [our demo repo](https://github.com/pluralsh/plural-up-demo).
