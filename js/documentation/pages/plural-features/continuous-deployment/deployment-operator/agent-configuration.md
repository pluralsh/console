---
title: AgentConfiguration
description: Tune deployment agent behavior via the AgentConfiguration CRD
---

`AgentConfiguration` tunes how the Plural **deployment agent** runs on a given cluster. Unlike `DeploymentSettings`, which configures global Console settings from the management cluster, `AgentConfiguration` is applied **on each agent cluster** and controls local operator behavior: poll intervals, concurrency limits, image registry overrides for job pods, and websocket connectivity.

Use it when you need per-cluster tuning — for example, slowing stack polling on a large fleet member, capping concurrent stack run jobs, or pointing stack/sentinel/agent-run images at an internal registry.

## Singleton resource

`AgentConfiguration` is **cluster-scoped** and a singleton. The deployment operator only reconciles a resource named `default`:

| Field | Required value |
| --- | --- |
| `metadata.name` | `default` |
| `metadata.namespace` | *(none — cluster-scoped)* |

Resources with any other name are ignored. Check `status.conditions` on the resource — you should see a `Synchronized` condition set to `False` with a message similar to:

```text
ignoring because of invalid name, only the default AgentConfiguration will be reconciled
```

When the name is correct and the spec is valid, expect `Synchronized=True` and `Ready=True` on `status.conditions`.

{% callout severity="warn" %}
Do not create multiple `AgentConfiguration` resources expecting them all to apply. Only `default` is processed. Merge all desired settings into a single `spec`.
{% /callout %}

## Minimal example

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: AgentConfiguration
metadata:
  name: default
spec:
  baseRegistryURL: your.enterprise.registry
```

## Spec reference

All fields are optional. Durations use Go duration strings (e.g. `"30s"`, `"5m"`, `"1h"`). Set a duration to `"0s"` to disable the corresponding background task.

The full schema is in the {% doclink to="overview_agent_api_reference" %}Agent API Reference{% /doclink %} under `AgentConfiguration`.

### Polling and upload intervals

These control how often the agent talks to the Console or uploads cluster data.

| Field | Purpose |
| --- | --- |
| `servicePollInterval` | How often the agent polls for service updates |
| `clusterPingInterval` | How often the agent sends cluster heartbeat pings |
| `stackPollInterval` | How often the agent polls for stack run changes. Set to `"0s"` to disable. |
| `pipelineGateInterval` | How often pipeline gates are evaluated. Set to `"0s"` to disable. |
| `compatibilityUploadInterval` | How often compatibility data is uploaded |
| `vulnerabilityReportUploadInterval` | How often vulnerability reports are uploaded |

```yaml
spec:
  servicePollInterval: "30s"
  clusterPingInterval: "10s"
  stackPollInterval: "0s"
  pipelineGateInterval: "0s"
  compatibilityUploadInterval: "15m"
  vulnerabilityReportUploadInterval: "10m"
```

### `maxConcurrentReconciles`

Caps the number of concurrent reconcile loops inside the agent. Increase for higher throughput on large clusters; decrease to reduce API server load.

```yaml
spec:
  maxConcurrentReconciles: 5
```

### Concurrency limits for jobs and pods

Optional limits on parallel work the agent schedules. Omit a field (or leave it unset) to disable that limit. When set, the value must be greater than zero.

| Field | Limits |
| --- | --- |
| `maxStackRunJobs` | Concurrent `StackRunJob` resources |
| `maxSentinelRunJobs` | Concurrent `SentinelRunJob` resources |
| `maxAgentRunPods` | Concurrent agent run pods |

```yaml
spec:
  maxStackRunJobs: 3
  maxSentinelRunJobs: 2
  maxAgentRunPods: 5
```

### `baseRegistryURL`

Overrides the default container registry for images launched by the agent — stack run jobs, sentinel run jobs, and agent run pods. Use this when vendoring Plural harness images to a private registry or pull-through cache.

```yaml
spec:
  baseRegistryURL: your.enterprise.registry
```

This is the per-cluster counterpart to fleet-wide agent image overrides in `DeploymentSettings.spec.agentHelmValues`. Use `agentHelmValues` on the management cluster to change the agent deployment itself; use `baseRegistryURL` on each agent cluster to retarget images for workloads the agent spawns.

See the [sandboxing guide](/getting-started/advanced-config/sandboxing) for enterprise registry setup.

### `disableWebsocket`

By default the agent maintains a websocket to the Console for push updates. Set to `true` to force polling-only mode. This is useful in edge or air-gapped environments where persistent outbound websockets are costly or blocked.

```yaml
spec:
  disableWebsocket: true
```

## Full example

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: AgentConfiguration
metadata:
  name: default
spec:
  clusterPingInterval: "10s"
  stackPollInterval: "0s"
  pipelineGateInterval: "0s"
  vulnerabilityReportUploadInterval: "10m"
  maxConcurrentReconciles: 5
  maxSentinelRunJobs: 2
  maxStackRunJobs: 3
  baseRegistryURL: your.enterprise.registry
  disableWebsocket: false
```

## Verifying configuration

After applying your manifest on an agent cluster:

```bash
kubectl get agentconfiguration default -o yaml
```

Check `status.conditions` for `Ready` and `Synchronized`. If either is `False`, read the `message` on the condition — the most common cause is an incorrect resource name (anything other than `default`).

## DeploymentSettings vs AgentConfiguration

| | `DeploymentSettings` | `AgentConfiguration` |
| --- | --- | --- |
| **Cluster** | Management cluster | Each agent/workload cluster |
| **Scope** | Namespaced (`plrl-deploy-operator`) | Cluster-scoped |
| **Singleton name** | `global` | `default` |
| **Configures** | Console-wide CD settings, fleet agent helm values, AI, observability | Local agent runtime: polls, limits, job image registry |
| **Docs** | [DeploymentSettings](/plural-features/continuous-deployment/management-controller/deployment-settings) | This page |
