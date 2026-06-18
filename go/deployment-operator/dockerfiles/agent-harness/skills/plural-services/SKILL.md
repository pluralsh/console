---
name: plural-services
description: Compares ServiceDeployment vs GlobalService and fleet deployment patterns. Use when creating or modifying ServiceDeployment, GlobalService, or child service CRs in Plural GitOps repos.
---
# GlobalService vs ServiceDeployment

Plural provides two CRDs for deploying workloads to Kubernetes clusters. Choosing the right
one — and knowing how they relate — is essential for working with GitOps repos correctly.

---

## TL;DR

| | `ServiceDeployment` | `GlobalService` |
|---|---|---|
| **Target** | Exactly **one** cluster | **All clusters** matching a selector |
| **Manifest** | Defined inline in the CR | Defined in `spec.template` (a `ServiceTemplate`) |
| **Child resources** | None (leaf) | Creates one `ServiceDeployment` per matched cluster |
| **Use when** | Single-env deployment or env-specific config | Fleet-wide services (monitoring, security agents, etc.) |

---

## ServiceDeployment

A `ServiceDeployment` deploys a workload to **one** cluster. It is the fundamental unit of
deployment in Plural.

### Minimal example

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: my-app-prod-eu
  namespace: infra
spec:
  cluster: prod-eu-1
  repositoryRef:
    name: my-app-repo
    namespace: infra
  git:
    ref: main
    folder: deploy/k8s
  namespace: my-app             # Kubernetes namespace on the target cluster
```

Inline git URL (no `GitRepository` CR) is also supported:

```yaml
spec:
  cluster: prod-eu-1
  git:
    url: git@github.com:my-org/my-app.git
    ref: main
    folder: kubernetes/manifests
  namespace: my-app
```

### Key spec fields

| Field | Purpose |
|---|---|
| `spec.cluster` | Cluster handle — short string matching `Cluster.spec.handle` |
| `spec.clusterRef` | ObjectReference alternative to `spec.cluster` |
| `spec.git` | Git ref + folder for raw/Kustomize manifests |
| `spec.helm` | Helm chart source, values, and release name |
| `spec.kustomize` | Kustomize base path |
| `spec.namespace` | Target namespace on the cluster |
| `spec.configuration` | Non-secret key-value pairs for Liquid templating |
| `spec.configurationRef` | Secret reference for sensitive template values |
| `spec.contexts` | Names of `ServiceContext` CRs to inject |
| `spec.imports` | Consume outputs from `InfrastructureStack` runs |
| `spec.dependencies` | Services that must be healthy first |
| `spec.protect` | Prevent accidental deletion |
| `spec.detach` | Remove from Console without deleting cluster resources |
| `spec.templated` | Enable Liquid templating on raw YAML files (default: true) |
| `spec.syncConfig` | Namespace creation, drift detection, ownership rules |

### Helm example

```yaml
spec:
  cluster: prod-eu-1
  helm:
    chart: nginx
    version: "1.2.3"
    repository:
      name: bitnami
      namespace: infra
    values:
      replicaCount: 2
      service:
        type: ClusterIP
    valuesFiles:
      - values/prod.yaml
```

### Kustomize example

```yaml
spec:
  cluster: prod-eu-1
  repositoryRef:
    name: my-app-repo
    namespace: infra
  git:
    ref: main
    folder: deploy
  kustomize:
    path: overlays/prod
```

---

## GlobalService

A `GlobalService` is a **fleet multiplexer**: it watches all clusters that match its
selector and automatically creates (and manages) one `ServiceDeployment` child per matching
cluster. When clusters are added or removed the controller reconciles accordingly.

### Minimal example

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: GlobalService
metadata:
  name: datadog-agent
  namespace: infra
spec:
  tags:
    env: prod
  template:                      # ServiceTemplate — fields are flat, NOT nested under .spec
    namespace: monitoring
    repositoryRef:
      name: monitoring-repo
      namespace: infra
    git:
      ref: main
      folder: agents/datadog
    helm:
      chart: datadog
      version: "3.x"
      repository:
        name: bitnami
        namespace: infra
```

### Targeting clusters

GlobalService offers multiple, composable selectors:

```yaml
spec:
  tags:
    env: prod                  # All clusters tagged env=prod
  distro: EKS                  # Further restrict to EKS clusters only
  mgmt: false                  # Exclude the management cluster (default)
  projectRef:
    name: platform-project     # Only clusters in this project
  ignoreClusters:
    - staging-eu-1             # Explicit exclusion by handle
```

All specified selectors are ANDed together.

### `spec.template` — the ServiceTemplate

`spec.template` is a `ServiceTemplate` with the **same top-level fields** as `ServiceSpec`
(`namespace`, `git`, `helm`, `kustomize`, `repositoryRef`, …). Do **not** nest them under
`template.spec`:

```yaml
spec:
  template:
    namespace: monitoring
    helm:
      chart: kube-state-metrics
      version: "5.3.0"
      repository:
        name: prometheus-community
        namespace: infra
```

Official example:
[Global services](https://docs.plural.sh/plural-features/continuous-deployment/global-service).

### Per-cluster values — prefer `Cluster.spec.metadata`

For fleet-wide services (external-dns, IRSA roles, per-cluster domains), put cluster-specific
data on each `Cluster` CR (or via Terraform `plural_cluster.metadata`) and reference it in
Liquid as `cluster.metadata.<key>` inside `.liquid` manifest or values files.

Example Cluster metadata (from official docs):

```yaml
spec:
  handle: eks-prod
  tags:
    fabric: eks
  metadata:
    externaldnsRoleArn: arn:aws:iam::123456789012:role/external-dns
    domain: prod.example.com
```

### `spec.context` — GlobalService-level template data

`spec.context.raw` adds YAML available to the template engine across all matched clusters.
Use for defaults; use `Cluster.spec.metadata` when values differ per cluster.

### `spec.serviceRef` — reuse an existing ServiceDeployment as template

Instead of writing a full `spec.template`, you can point at an existing `ServiceDeployment`
and the `GlobalService` will clone its spec to all targeted clusters:

```yaml
spec:
  serviceRef:
    name: my-app-canary
    namespace: infra
  tags:
    env: staging
```

### Deletion cascade

Control what happens when the `GlobalService` is deleted:

```yaml
spec:
  cascade:
    delete: true    # Delete child ServiceDeployments AND cluster resources
    detach: false   # (alternatively) Orphan cluster resources, remove from Console
```

---

## Finding child ServiceDeployments

The Console links children via `GlobalService.services`. In a GitOps repo, child
`ServiceDeployment` CRs may also exist — they are **reconciled from** the parent
`GlobalService` and manual edits to children are overwritten.

To download rendered manifests via Plural MCP `downloadServiceManifests`, use the **child**
`ServiceDeployment` name and cluster handle — not the `GlobalService` name.

Naming is deterministic (derived from GlobalService name + cluster handle) but varies — list
services in Console or search the repo for CRs targeting the same template source.

---

## Decision guide

Use **`ServiceDeployment`** when:
- Deploying to a single, known cluster.
- Each environment (dev/staging/prod) needs meaningfully different configuration that
  cannot be expressed through a template + context.
- You need fine-grained ordering via `spec.dependencies`.

Use **`GlobalService`** when:
- The same workload should run on all (or a tagged subset of) clusters — e.g. logging
  agents, security scanners, cert-manager, monitoring exporters.
- You want the fleet to stay in sync automatically as new clusters are added.
- Per-cluster overrides are small enough to fit in `spec.context`.

---

## Relationship diagram

```
GlobalService (fleet selector)
    │   spec.tags: {env: prod}
    │   spec.distro: EKS
    │
    ├──► creates ──► ServiceDeployment (cluster: prod-eu-1)
    ├──► creates ──► ServiceDeployment (cluster: prod-us-1)
    └──► creates ──► ServiceDeployment (cluster: prod-ap-1)
                          │
                          └──► deploys ──► Kubernetes workload
```

---

## Common mistakes

| Mistake | Fix |
|---|---|
| Editing a child `ServiceDeployment` that belongs to a `GlobalService` | Edit the parent `GlobalService.spec.template` instead — child changes are overwritten on the next reconcile |
| Using `GlobalService` for a service that needs totally different config per cluster | Use separate `ServiceDeployment` CRs per cluster |
| Passing `GlobalService` name to `downloadServiceManifests` | Find and use the child `ServiceDeployment` name |
| Forgetting `spec.mgmt: true` when you want the management cluster included | Set `mgmt: true` explicitly — it defaults to false |

---

## Official docs extensions

For field-level CRD specs, start with the
[Management API Reference](https://docs.plural.sh/api-reference/kubernetes/management-api-reference)
(`ServiceDeployment`, `GlobalService`, `ServiceContext`, …).

For advanced service patterns, cross-check these pages:

- Global service targeting and cluster-specific templating:
  https://docs.plural.sh/plural-features/continuous-deployment/global-service
- Service templating model (Liquid + available data):
  https://docs.plural.sh/plural-features/continuous-deployment/service-templating
- Multi-source services (`spec.sources` + `spec.renderers`):
  https://docs.plural.sh/plural-features/continuous-deployment/multi-source-services
- Helm service variants (including Lua-driven dynamic values):
  https://docs.plural.sh/plural-features/continuous-deployment/helm-service
- Resource application logic (`sync-options`, `sync-wave`):
  https://docs.plural.sh/plural-features/continuous-deployment/resource-application-logic

Use these extensions when one standard `git`/`helm` service definition is not enough, but keep
the base distinction intact: `ServiceDeployment` is single-cluster, `GlobalService` is fleet-wide.

