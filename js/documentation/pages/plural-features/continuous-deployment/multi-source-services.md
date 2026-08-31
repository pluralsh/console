---
title: Multi-source services
description: Combine Helm charts, Git manifests, and custom renderers in a single atomic deployment
---

Multi-source services let you assemble manifests from more than one origin—typically an upstream Helm chart plus Git-managed YAML—and ship them to the cluster as a single `ServiceDeployment`. The deployment operator renders each piece, merges the result, and applies everything in one sync.

The most common use case is deploying an **operator and its custom resources together**: install the operator from a Helm chart, then apply the CRs that configure it from your infra repo, without splitting them into separate services or worrying about race conditions during rollout.

## Example: datastore operator + custom resources

Here's a basic example using our datastore-operator (which manages things like elasticsearch indexes and postgres databases via GitOps):

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: datastore-operator
  namespace: infra
spec:
  namespace: elastic
  cluster: mgmt
  sources:
  - repositoryRef:
      kind: GitRepository
      name: infra
      namespace: infra
    git:
      folder: services/datastores # location in git
      ref: main
    path: datastore-crs # location in tarball delivered to deployment-operator
  renderers:
  - path: datastore-crs
    type: RAW
  helm:
    url: https://pluralsh.github.io/console
    version: 0.0.46
    chart: datastore
```

The Git folder `services/datastores` holds the operator's custom resources, for example:

```yaml
# services/datastores/elastic.yaml
apiVersion: dbs.plural.sh/v1alpha1
kind: ElasticsearchCredentials
metadata:
  name: elasticsearch
spec:
  url: http://elasticsearch-es-http.elastic:9200
  username: elastic
  passwordSecretKeyRef:
    name: elasticsearch-es-elastic-user
    key: elastic
```

```yaml
# services/datastores/ilm.yaml
apiVersion: dbs.plural.sh/v1alpha1
kind: ElasticsearchILMPolicy
metadata:
  name: plrl-ilm
spec:
  name: plrl-ilm
  credentialsRef:
    name: elasticsearch
  definition:
    policy:
      phases:
        warm:
          min_age: 5d
          actions:
            forcemerge:
              max_num_segments: 1
        delete:
          min_age: 7d
          actions:
            delete: {}
```

Because both the Helm release and the CRs belong to one service, they share a revision, drift detection, and sync lifecycle.

## How `sources` works

Each entry in `spec.sources` fetches content from a Git repository and places it under a dedicated subdirectory in the tarball the Console delivers to the deployment operator.

| Field | Role |
| --- | --- |
| `repositoryRef` | Reference to a `GitRepository` CR (or inline `git.url`) |
| `git.folder` | Subdirectory within that repo to fetch |
| `git.ref` | Branch, tag, or commit to checkout |
| `path` | Subdirectory name inside the final tarball |

The **primary source** (`spec.helm`, `spec.git`, or `spec.kustomize`) is unpacked at the tarball root. Each additional `sources` entry is merged under its own `path`. For the example above, the tarball layout looks like:

```
./                          # Helm chart files (from spec.helm)
Chart.yaml
templates/
...
datastore-crs/              # from spec.sources[0].path
  elastic.yaml
  ilm.yaml
  indextemplate.yaml
```

If `path` is omitted, files from that source are placed at the tarball root alongside the primary source. When multiple sources specify the same `path`, their files are merged into that directory.

This is distinct from the simpler pattern documented in [Helm-sourced services](helm-service.md#multi-source-helm), where `spec.git` provides values files for a Helm chart. The `sources` field is for **additional** Git locations beyond the primary source, each with its own destination directory.

## How `renderers` works

Before manifests are applied, the deployment operator renders the tarball into a flat list of Kubernetes objects. Rendering happens in two stages:

1. **Default render** — The operator inspects the tarball root and auto-detects the renderer (`HELM` if it finds `Chart.yaml`, `KUSTOMIZE` if it finds `kustomization.yaml`, otherwise `RAW`). This uses the top-level `spec.helm`, `spec.kustomize`, or raw YAML settings.
2. **Explicit renderers** — Each entry in `spec.renderers` is processed **in list order**. Each renderer runs against `tarball-root/<renderer.path>` using the specified type.

Supported renderer types:

| Type | Behavior |
| --- | --- |
| `AUTO` | Auto-detect Helm, Kustomize, or RAW at the given path |
| `HELM` | Render a Helm chart at the path; optional per-renderer `helm` overrides for values, release name, etc. |
| `KUSTOMIZE` | Run Kustomize at the path |
| `RAW` | Apply YAML files directly (with optional Liquid templating) |

In the datastore example, the default pass renders the Helm chart at `./`, and the explicit `RAW` renderer processes everything under `datastore-crs/`.

When `spec.renderers` is non-empty, the operator **deduplicates** the combined manifest list. If the same object (group, version, kind, namespace, name) appears more than once, the copy from the **later** renderer wins. This lets an explicit renderer override resources produced by the default pass or an earlier renderer.

To render only specific paths and skip the default root pass, list a renderer for each path you need—including the root with `path: .` and the appropriate type.

## Controlling apply order

Rendering order and apply order are separate concerns. Once all manifests are rendered and merged, the deployment operator applies them according to [Resource Application Logic](resource-application-logic.md):

- **Default wave ordering** groups resources by kind (cluster-scoped first, then config, workloads, networking, and everything else).
- **Sync waves** (`deployment.plural.sh/sync-wave`) override that default and let you enforce explicit ordering within a sync.

For operator + CR deployments, you often need the operator (and its CRDs) running before custom resources are accepted by the API server. In practice:

- Helm charts for operators usually install CRDs and the controller in early default waves (CRDs are cluster-scoped, wave 0).
- If your CRs must wait for the operator webhook or controller to be ready, add a sync wave annotation to delay them:

```yaml
apiVersion: dbs.plural.sh/v1alpha1
kind: ElasticsearchCredentials
metadata:
  name: elasticsearch
  annotations:
    deployment.plural.sh/sync-wave: "5"
spec:
  # ...
```

You can also use **sync hooks** (`deployment.plural.sh/sync-hook`) for pre-sync or post-sync jobs—for example, a migration that must complete before the main workload rolls out. See [Resource Application Logic](resource-application-logic.md) for sync waves, hooks, and hook delete policies.

{% callout severity="info" %}
Multi-source services make it easy to ship an operator and its CRs atomically, but Kubernetes still enforces API-level ordering. Use sync waves when the default kind-based ordering is not enough—for example, when CRs depend on a validating webhook that the operator registers after startup.
{% /callout %}

## When to use multi-source services

| Scenario | Primary source | Additional `sources` |
| --- | --- | --- |
| Operator + CRs | `spec.helm` (upstream chart) | Git folder with CR manifests |
| Helm chart + Kustomize overlays | `spec.helm` | Git folder with Kustomize base/overlays |
| Multiple Git repos | `spec.git` | Additional repos at distinct `path` values |
| Helm values from Git | `spec.git` + `spec.helm` | *(use the simpler pattern in [Helm-sourced services](helm-service.md#multi-source-helm) instead)* |

## Related documentation

- [Helm-sourced services](helm-service.md) — primary Helm configuration and values-from-Git pattern
- [Git-sourced services](git-service.md) — sourcing manifests directly from Git
- [Resource Application Logic](resource-application-logic.md) — sync waves, hooks, and apply ordering
