# Plural GitOps Repository Structure

A Plural-managed GitOps repository holds Kubernetes Custom Resource manifests (`apiVersion:
deployments.plural.sh/v1alpha1`) that the **management controller** reconciles into the Plural
Console API. The **deployment-operator agent** on each cluster then applies workloads from
Console.

Understanding the layout helps you locate, read, and modify the right files without breaking
unrelated services.

---

## Top-level layout

```
<repo-root>/
  clusters/               # Cluster CRs (one per managed cluster)
  services/               # ServiceDeployment CRs (single-cluster deployments)
  global-services/        # GlobalService CRs (fleet-wide deployments)
  stacks/                 # InfrastructureStack CRs (IaC runs)
  projects/               # Project CRs (optional multi-tenancy grouping)
  git-repositories/       # GitRepository CRs (SCM source references)
  pipelines/              # Pipeline CRs (promotion workflows)
  namespaces/             # ManagedNamespace CRs
  observers/              # Observer CRs (event-driven triggers)
```

> **Note**: Directory names vary by repo. There is no required layout — `plural up` generates
> one reference architecture, but teams often reorganize. Find CRs with:
>
> ```bash
> grep -rl 'kind: ServiceDeployment\|kind: InfrastructureStack\|kind: GlobalService' .
> grep -rl 'deployments.plural.sh/v1alpha1' .
> ```

Application manifests and Terraform usually live in **separate git repos** referenced by
`GitRepository` + `spec.git.folder`, not necessarily next to the CR YAML.

---

## Cluster CRs (`clusters/`)

Each file describes one registered cluster (management or workload).

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: Cluster
metadata:
  name: prod-eu-1
  namespace: infra
spec:
  handle: prod-eu-1       # Short handle used in ServiceDeployment.spec.cluster
  projectRef:
    name: my-project
  tags:
    env: prod
    region: eu-west-1
  metadata:               # Arbitrary JSON — key for fleet-wide templating
    externaldnsRoleArn: arn:aws:iam::123456789012:role/external-dns
    domain: prod.example.com
```

Key fields:
- **`spec.handle`** — referenced by `ServiceDeployment.spec.cluster` and Plural MCP
  `downloadServiceManifests`. Prefer the handle over `metadata.name`.
- **`spec.tags`** — used by `GlobalService` cluster selection.
- **`spec.metadata`** — per-cluster values exposed as `cluster.metadata.*` in Liquid templates
  (often populated from Terraform via `plural_cluster`).

Read-only clusters: if `.status.readonly: true`, the cluster was created elsewhere (e.g.
Terraform). The controller observes it — do not treat the CR as the write path.

---

## GitRepository CRs (`git-repositories/`)

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

Plural is **Flux-interoperable** for repository types — many repos reuse Flux source patterns.

---

## Namespace conventions

Most CRs share one namespace per repo (`infra`, `plural`, or a project namespace). Match
existing files before creating new ones.

---

## How reconciliation works

### Management controller (CRD → Console)

1. Watches CRDs in the GitOps repo (via Flux, app-of-apps, or direct apply).
2. **Creation mode** — creates/updates/deletes the matching Console resource; sets `.status.id`.
3. **Read-only mode** — resource already exists externally; controller sets `.status.id` but
   does not push spec changes or delete Console on CR removal.

See [management-controllers-reconciliation-logic](https://docs.plural.sh/plural-features/continuous-deployment/management-controllers-reconciliation-logic).

### Deployment operator (Console → cluster)

On each target cluster, the agent:
- **ServiceDeployment / GlobalService children** → fetch git/helm, render, apply manifests.
- **InfrastructureStack** → not applied here; stack runs are Batch Jobs (see
  `infrastructure-stack.md`).

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
on the deployment-operator agent — not in the GitOps CR YAML itself.

Templatable files (per [official docs](https://docs.plural.sh/plural-features/continuous-deployment/service-templating)):
- Raw YAML: files with a `.liquid` extension (e.g. `deployment.yaml.liquid`)
- Helm: values files ending in `.liquid`

`spec.templated: true` (default) gates whether templating runs. Available Liquid roots
(from the deployment-operator renderer):

| Variable | Contents |
|----------|----------|
| `cluster` | `handle`, `name`, `distro`, `tags`, **`metadata`**, `kasUrl`, … |
| `configuration` | `spec.configuration` key-value pairs on the service |
| `contexts` | Named `ServiceContext` configurations |
| `imports` | Stack outputs keyed by stack name → output name |
| `service` | Service name, namespace, helm block |

Use `cluster.metadata.<key>` for fleet-specific IRSA ARNs, domains, etc.

---

## Official docs

- [Management API Reference](https://docs.plural.sh/api-reference/kubernetes/management-api-reference) — all `deployments.plural.sh/v1alpha1` CRD types and fields
- [Continuous deployment overview](https://docs.plural.sh/plural-features/continuous-deployment)
- [Git-sourced services / app-of-apps](https://docs.plural.sh/plural-features/continuous-deployment/git-service)
- [Deployment operator](https://docs.plural.sh/plural-features/continuous-deployment/deployment-operator)
- [Controller reconciliation modes](https://docs.plural.sh/plural-features/continuous-deployment/management-controllers-reconciliation-logic)

**Rule of thumb**: if Terraform or another tool owns a resource, do not duplicate writes from
GitOps YAML — observe via read-only CRs or stack outputs instead.
