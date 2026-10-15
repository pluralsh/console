---
title: Insight priority and cluster health score
description: How the deployment operator prioritizes failing workloads, scores cluster health, and how to customize both
---

Every few minutes the deployment operator reports two things about its cluster to Console: a list of failing components, each with a priority from `LOW` to `CRITICAL`, and a single cluster health score from 0 to 100. Console generates an AI insight for every listed component, shows the priority in the UI, and uses it to decide which failures deserve a response. The health score drives the cluster heatmap, the health chip, and the `healthScore` filters of the API.

Both are computed by the operator itself from the objects it watches, with fixed rules. The same failure always gets the same priority, and the priority is never decided by an LLM. You can pin or ignore single objects with an annotation, or change the rules for whole groups of objects with a `CustomInsightPriority`.

## What counts as a failure

The operator reports one **root** per failure rather than one row per failing pod:

- Every failed object is followed up its owners, at most four levels, to the first Deployment, StatefulSet, DaemonSet, Ingress, Certificate or CronJob. That object is the root. A Deployment with ten crashlooping pods is one root.
- If the owners end without such an object, the top-most owner is the root. This is how failed nodes, persistent volume claims, standalone pods and jobs, Argo Rollouts, Flagger canaries, and custom resources that a [CustomHealth](/plural-features/continuous-deployment/deployment-operator/custom-health) script marks as degraded are reported.
- A failure that is more than four levels below the nearest owner is ignored.
- A CronJob is a failure only while its newest job failed, and a node only after it has been failing for five minutes.

Failures of workloads deployed by a Plural service are reported too. They carry the service that manages them, taken from the object or its nearest owner, and Console links the component to that service.

## How the priority is decided

The first source that applies wins:

1. The `deployments.plural.sh/insight-priority` annotation on the object.
2. The `CustomInsightPriority` script that owns the object.
3. The built-in score.

### The built-in score

The score is the criticality of the component plus the severity of its failure, and it maps to a priority at 25, 50 and 75:

| Score | Priority |
| ----- | -------- |
| below 25 | `LOW` |
| 25 to 49 | `MEDIUM` |
| 50 to 74 | `HIGH` |
| 75 and above | `CRITICAL` |

Every failing object is either a **core component** of the cluster or an **app**, and that decides the range it can reach on its own:

| Class | Starts at | Highest it can get | Typical result |
| ----- | --------- | ------------------ | -------------- |
| App | 10, or 35 for Ingresses, Certificates and persistent volumes | `MEDIUM` | partly down is `LOW`, down or with a broken Ingress or Certificate is `MEDIUM` |
| Core | 60 | `CRITICAL` | partly down is `HIGH`, mostly down is `CRITICAL` |

`HIGH` and `CRITICAL` are therefore reserved for what keeps the cluster and the apps running, and a broken third-party workload never turns the cluster red on its own. To treat one of your own apps as important, pin its priority with an [annotation](#annotations) or a [script](#custominsightpriority), neither is limited by this.

**Criticality** says whether the component is core. The first rule that matches decides:

1. A `system-*` priority class, such as `system-cluster-critical`, is core.
2. A well-known cluster component is matched by name and is core. These are DNS (`coredns`, `kube-dns`), `kube-proxy`, CNI plugins (`aws-node`, `cilium`, `calico`, `flannel` and others), CSI drivers, service mesh control planes (`istio`, `linkerd`), `cert-manager`, ingress controllers, `metrics-server`, the cluster autoscaler and Karpenter.
3. A system namespace is core: `kube-system`, `istio-system`, `linkerd`, `cert-manager`, `ingress-nginx`, `traefik`, `calico-system`, `tigera-operator`, `cilium`, `plrl-console` and `plrl-deploy-operator`.
4. A node is core.
5. Everything else is an app. A Deployment, StatefulSet, DaemonSet, Job or CronJob starts at 10. An Ingress, Certificate or persistent volume starts at 35.

Names are matched on whole words only. The name is split on `-`, `_` and `.`, and any run of consecutive words, joined together, can match a known component, so `core-dns` and `rke2-ingress-nginx-controller` match, while `concert-manager` and `core-banking-dns-proxy` do not.

**Severity** says how bad the failure is, and adds to the criticality:

- Up to 20 points for the share of replicas that are not ready. A Deployment with none of its three replicas ready adds the full 20, one with two of three ready adds 7. A core component with three quarters of its replicas down is `CRITICAL`.
- 3 points when the failure has lasted an hour, 5 points when it has lasted a day.

The score of an app stops at 49 however severe the failure is.

## Annotations

Set the annotation on any object, usually the Deployment, StatefulSet or DaemonSet itself:

```yaml
metadata:
  annotations:
    deployments.plural.sh/insight-priority: HIGH
```

`LOW`, `MEDIUM`, `HIGH` and `CRITICAL` pin the priority. `IGNORE` removes the object from the insights and from the health score. Scripts never see an object that has the annotation.

## CustomInsightPriority

A `CustomInsightPriority` runs a Python script over the failing objects it targets and lets it set their priority. Like [CustomHealth](/plural-features/continuous-deployment/deployment-operator/custom-health), it is a deployment-operator API, so apply it to each cluster where it should be used, or distribute it with a [GlobalService](/plural-features/continuous-deployment/global-service).

The built-in rules rank a third-party workload at most `MEDIUM`, because the operator cannot know which of your apps matter. A script is how you tell it. The example below treats the StatefulSets labelled `tier: core` in two namespaces as important and raises them to `CRITICAL` when none of their replicas is ready:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: CustomInsightPriority
metadata:
  name: payments
  namespace: plrl-deploy-operator
spec:
  target:
    kinds:
      - group: apps
        kind: StatefulSet
    namespaces: [payments, ledger]
    labelSelector:
      matchLabels:
        tier: core
  precedence: 100
  script: |
    def evaluate(input):
        out = {}
        for r in input["rows"]:
            if r["ready_replicas"] == 0:
                out[r["uid"]] = {"priority": "CRITICAL", "reason": "no ready replicas"}
        return out
```

The CRD is installed by the `deployment-operator` chart. Helm does not upgrade CRDs of an existing release, so on a cluster that was installed before this API existed, apply the CRD from the chart's `crds/` directory first. An agent that finds no CRD starts without the feature and logs it.

{% callout severity="warn" %}
A `CustomInsightPriority` has a cluster-wide effect whatever namespace it lives in. Its script receives the failing objects of every namespace it targets, with their labels and health messages, plus the names of all failing roots in the cluster, and it can hide failures with `IGNORE`. Only allow people you would trust with CustomHealth, or cluster-admin, to create it.
{% /callout %}

### Targeting

`spec.target` selects the failing objects the script is responsible for. An object has to match every field that is set, so an empty target matches everything.

- `kinds` is a list of `group`, optional `version`, and `kind`.
- `namespaces` is a list of namespaces. Cluster-scoped objects only match when this is empty.
- `labelSelector` is a standard label selector on the labels of the object.

When several scripts match an object, the one with the highest `spec.precedence` owns it, and ties are broken by name. A script only receives the objects it owns, and scripts are not chained. A script that lost objects to another one gets the `Overlapping` condition naming the winners.

### The script contract

The script defines `evaluate(input)` and returns a dictionary from the `uid` of a row to `{"priority": ..., "reason": ...}`. `priority` is `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` or `IGNORE`, and `reason` is optional. Rows that are left out keep their built-in priority. Returning nothing is fine.

`input` contains:

```json
{
  "now": "2026-10-09T12:00:00Z",
  "cluster": {
    "nodes": 12,
    "namespaces": 41,
    "failing_roots": [{ "kind": "DaemonSet", "namespace": "kube-system", "name": "aws-node", "builtin_priority": "CRITICAL" }]
  },
  "rows": [
    {
      "uid": "6c1f...",
      "group": "apps", "version": "v1", "kind": "StatefulSet",
      "namespace": "payments", "name": "ledger-db",
      "labels": { "tier": "core" },
      "managed": true, "service_id": "a1b2...",
      "priority_class": "",
      "state": "failed",
      "health_message": "Deployment \"ledger-db\" exceeded its progress deadline",
      "desired_replicas": 3, "ready_replicas": 0,
      "descendants": { "Pod": { "failed": 3, "pending": 0 } },
      "created_at": "2026-10-01T08:00:00Z", "failing_since": "2026-10-09T11:00:00Z",
      "criticality": 10, "builtin_score": 30,
      "builtin_priority": "MEDIUM", "builtin_reason": "kind default: StatefulSet"
    }
  ]
}
```

`state` is `failed` when the object itself is failing, and `pending` when only objects it owns are. `desired_replicas` and `ready_replicas` are `None` for kinds without replicas. Manifests, events, logs, metrics and annotations are not part of the input.

The script runs in a sandbox. It has no access to the network, the file system, the environment, the clock or the cluster, so the same input always gives the same result. Loading the script and calling `evaluate` are each stopped after two seconds.

### Errors

- A script that does not compile, or does not define `evaluate`, is never used. The resource gets `Ready=False` with the reason `InvalidScript`.
- A script that raises, times out, or returns something that does not follow the contract, such as an unknown `uid` or priority, only affects its own objects: they keep their built-in priority. The resource gets `Ready=False` with the reason `EvaluationFailed`, `status.lastError` has the type of the exception and the line of the script, never its message, the operator emits a Warning event, and the `agent_insight_priority_failures_total` metric counts it. Other scripts are not affected.

`status.lastEvaluation` shows how many objects the script owned, how many it gave a priority, how many it ignored, and how long it took.

## Cluster health score

The score starts at 100 and loses a penalty for every failing root that is not ignored, as decided by the priority above:

| Priority | Penalty per root | Most that one priority can take |
| -------- | ---------------- | -------------------------------- |
| `LOW` | 2 | 10 |
| `MEDIUM` | 8 | 30 |
| `HIGH` | 25 | no limit |
| `CRITICAL` | 50 | no limit |

The score is never below 0. Low and medium failures are capped, so any number of unimportant failures leaves a cluster in the green band, while a single critical failure moves it to 50 and two high failures to 50 as well. Raising an object with an annotation or a script moves it out of the capped tiers. The score and the insights list are computed from the same roots in the same moment, so everything that lowers the score is in the list, unless it is ignored.

{% callout severity="info" %}
This changes what the score means. It no longer scales with the number of pods or the size of the cluster, pending objects no longer lower it, and a failing DNS, CNI or ingress controller now lowers it. Expect scores to move after upgrading, and review any API `healthScore` filters or automations that depend on exact values.
{% /callout %}

## Recovering components

A component that stops failing stays in the list with its last priority for ten minutes, so a workload that flaps does not lose its AI insight every time it recovers. It does not count towards the health score during that time. Set the period with the `--insight-grace-period` argument of the operator, `0` turns it off. Objects that are deleted or annotated `IGNORE` leave the list immediately.

After the operator starts, the first report waits until it has loaded the state of the whole cluster, so a restart never reports a partial list.
