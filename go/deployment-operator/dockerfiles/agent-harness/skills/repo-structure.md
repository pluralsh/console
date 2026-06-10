# Plural GitOps Repository Structure

A Plural-managed GitOps repository holds Kubernetes Custom Resource manifests (`apiVersion:
deployments.plural.sh/v1alpha1`).

## Cluster CRs

Each file **adopts** an existing cluster already registered in Console — it does **not**
provision a new cluster from YAML alone. The controller looks up `spec.handle` in Console,
sets `.status.readonly: true`, and syncs a limited set of fields (tags, metadata, bindings).

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: Cluster
metadata:
  name: prod-eu-1
  namespace: infra
spec:
  handle: prod-eu-1       # Required — must match an existing Console cluster handle
  tags:
    env: prod
    region: eu-west-1
  metadata:               # Arbitrary JSON — exposed in Liquid as cluster.metadata.*
    externaldnsRoleArn: arn:aws:iam::123456789012:role/external-dns
    domain: prod.example.com
```

Key fields:
- **`spec.handle`** — must match a cluster already in Console. Used by
  `ServiceDeployment.spec.cluster` and Plural MCP `downloadServiceManifests`.
- **`spec.tags`** — synced to Console; used by `GlobalService` cluster selection.
- **`spec.metadata`** — synced to Console; available as `cluster.metadata.*` in Liquid (often
  populated from Terraform via `plural_cluster`).

Clusters are provisioned via Terraform or Console — not by applying a bare Cluster CR without
a matching handle.

---

## GitRepository CRs

SCM sources referenced by `ServiceDeployment` and `InfrastructureStack` via `spec.repositoryRef`.
You can also inline `spec.git.url` on a ServiceDeployment without a separate CR.

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: GitRepository
metadata:
  name: my-app-repo
  namespace: infra
spec:
  url: https://github.com/my-org/my-app.git
```

Plural CD is **Flux-interoperable** for source types ([deployment operator
docs](https://docs.plural.sh/plural-features/continuous-deployment/deployment-operator)).

---

## Namespace conventions

Most CRs share one namespace per repo (`infra`, `plural`, or a project namespace). Match
existing files before creating new ones.

---

## How reconciliation works

### Management controller (CRD → Console)

Runs on the **management cluster**. Watches CRDs applied there (Flux, app-of-apps, or
`kubectl apply`).

| Mode | When | Behavior |
|------|------|----------|
| **Creation** | New CR, no matching Console resource | Creates Console resource; sets `.status.id`; manages updates/deletes via finalizers |
| **Read-only** | Resource already in Console and `spec.reconciliation.driftDetection: false`, or resource owned elsewhere (e.g. Terraform-provisioned Cluster) | Sets `.status.id`; does **not** push spec changes or delete Console on CR removal |

Most writable GitOps resources (`ServiceDeployment`, `GlobalService`, `InfrastructureStack`) use
**creation mode** when defined only in git. `Cluster` is special: it always adopts by handle and
runs in read-only mode after linking.

See [management-controllers-reconciliation-logic](https://docs.plural.sh/plural-features/continuous-deployment/management-controllers-reconciliation-logic).

### Deployment operator (Console → cluster)

Runs on **each registered cluster** (agent pod):

- **ServiceDeployment** (and GlobalService children) → clone git / pull helm, render, apply
  manifests on **that** cluster.
- **InfrastructureStack** → stack runs execute as **Batch Jobs** on the cluster referenced by
  `InfrastructureStack.spec.clusterRef` (often mgmt), not as ongoing service sync. See
  `infrastructure-stack.md`.

The management controller does not talk to workload clusters directly for CD — Console is the
hub between git CRDs and per-cluster agents.

---

## Common patterns

### Referencing another CR

```yaml
clusterRef:
  name: prod-eu-1
  namespace: infra
repositoryRef:
  name: my-app-repo
  namespace: infra
```

Shorthand: `spec.cluster: prod-eu-1` instead of `clusterRef` — follow the repo's convention.

### Liquid templating

Plural uses [Liquid](https://shopify.github.io/liquid/) (plus a Sprig subset) at **apply time**
on the deployment-operator agent — not inside GitOps CR YAML.

Templatable files ([official docs](https://docs.plural.sh/plural-features/continuous-deployment/service-templating)):
- Raw services: files whose path ends in **`.liquid`** (e.g. `deployment.yaml.liquid`)
- Helm: values files ending in **`.liquid`**

Plain `.yaml` / `.yml` files are **not** Liquid-processed. `spec.templated: true` (default)
enables Liquid only for `.liquid` files; when `false`, even `.liquid` files are skipped.

Available Liquid roots (from `pkg/manifests/template/`):

| Variable | Contents |
|----------|----------|
| `cluster` | `handle`, `name`, `distro`, `tags`, `metadata`, `kasUrl`, … |
| `configuration` | `spec.configuration` key-value pairs on the service |
| `contexts` | Named `ServiceContext` configurations |
| `imports` | Stack outputs: `imports.<stack-name>.<output-name>` |
| `service` | Service name, namespace, helm block |

Use `cluster.metadata.<key>` for per-cluster IRSA ARNs, domains, etc.

Helm also supports **Lua** scripts for dynamic values — see `official-cd-extensions.md`.

---

## Official docs

- [Management API Reference](https://docs.plural.sh/api-reference/kubernetes/management-api-reference) — all `deployments.plural.sh/v1alpha1` CRD types and fields
- [Continuous deployment overview](https://docs.plural.sh/plural-features/continuous-deployment)
- [Git-sourced services / app-of-apps](https://docs.plural.sh/plural-features/continuous-deployment/git-service)
- [Deployment operator](https://docs.plural.sh/plural-features/continuous-deployment/deployment-operator)
- [Controller reconciliation modes](https://docs.plural.sh/plural-features/continuous-deployment/management-controllers-reconciliation-logic)

**Rule of thumb**: if Terraform or another tool owns a resource, do not duplicate writes from
GitOps YAML — observe via read-only CRs or consume stack outputs via `spec.imports`.
