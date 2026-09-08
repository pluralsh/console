---
title: Edge configuration
description: Configure Plural for large edge Kubernetes fleets
---

## Why Plural works at the edge

Plural uses a pull-based architecture designed for clusters with restricted or intermittent connectivity. Each workload cluster runs a lightweight deployment agent that initiates connections to the management plane. The management plane does not need inbound network access to the cluster, and deployment credentials remain on the edge device. See the [architecture overview](/overview/architecture) for the complete design.

![Plural's management-plane and workload-cluster architecture](/assets/deployments/architecture.png)

The architecture is built for scale:

* Agent communication is egress-only, so edge devices do not need public endpoints, inbound firewall rules, or a shared private network with the management plane.
* Plural's [Git-aware caching and distribution layer](/resources/architecture/gitops-architecture) fetches source repositories centrally, creates content-addressed deployment artifacts, and serves them through multiple cache levels. Agents normally fetch a small digest and download an artifact only when its content changes. This avoids multiplying source-control and management-plane traffic by the number of clusters.
* Plural has been deployed in production environments with more than 5,000 edge clusters.

For very large fleets, tune the agent to reduce background traffic and persist its caches locally.

## Reduce agent polling

Apply an `AgentConfiguration` named `default` on every edge cluster. The following configuration keeps only service and cluster heartbeat polling enabled, sets both to 20 minutes, disables the persistent websocket, and turns off other periodic agent tasks:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: AgentConfiguration
metadata:
  name: default
spec:
  servicePollInterval: "20m"
  clusterPingInterval: "20m"
  managedNamespacePollInterval: "0s"
  compatibilityUploadInterval: "20m"
  stackPollInterval: "0s"
  sentinelPollInterval: "0s"
  pipelineGateInterval: "0s"
  vulnerabilityReportUploadInterval: "0s"
  disableWebsocket: true
```

Setting an interval to `"0s"` disables that task. This profile minimizes requests from each device, but it also disables Stack runs, Sentinel runs, pipeline gate evaluation, vulnerability report uploads, and managed namespace polling on those clusters.  We also downtune other polls from their existing defaults, usually 2-3m to support higher scale, this can be toggled up and down based on total fleet, we've found there's usually little need to tune until you get around 1k clusters.

If an edge cluster needs any of those features, enable its corresponding interval rather than copying this profile unchanged. See [AgentConfiguration](/plural-features/continuous-deployment/deployment-operator/agent-configuration) for the complete field reference and verification steps.

## Enable durable agent caches

Configure the deployment operator chart for the whole fleet through the `DeploymentSettings` resource on the management cluster:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: DeploymentSettings
metadata:
  name: global
  namespace: plrl-deploy-operator
spec:
  agentHelmValues:
    cache:
      hostPath:
        enabled: true
```

This mounts a node-local directory into the deployment operator and enables its durable cache. Cached manifests and agent state survive same-node pod restarts and upgrades, reducing cold-start downloads and recomputation on edge devices.

{% callout severity="warning" %}
The cache uses node-local `hostPath` storage. It does not follow the pod to another node, so an agent scheduled elsewhere starts with an empty cache. Keep the agent replica count at `1` when `cache.hostPath.enabled` is enabled.
{% /callout %}

`DeploymentSettings.spec.agentHelmValues` supplies defaults to agents managed by Plural. Existing agents receive the values during their next agent chart update. See [DeploymentSettings](/plural-features/continuous-deployment/management-controller/deployment-settings#agenthelmvalues) for more details.
