# GitRepository

Plural CD separates **where CRs are defined** from **where application or IaC code lives**:

| Repo role | Contents | Typical path |
|---|---|---|
| **GitOps repo** | Plural management CRs (`ServiceDeployment`, `GitRepository`, `Cluster`, …) | `manifests/*.yaml` |
| **Source repo** | Helm charts, Kustomize, raw YAML, Terraform, etc. | paths referenced by `spec.git.folder` |

A `GitRepository` CR registers a **source repo** in Console so `ServiceDeployment` and
`InfrastructureStack` can clone it without repeating the URL.

---

## GitRepository CR

Cluster-scoped (`deployments.plural.sh/v1alpha1`, no namespace):

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: GitRepository
metadata:
  name: my-app-repo
spec:
  url: https://github.com/my-org/my-app.git
  connectionRef:          # optional — reuse an ScmConnection for auth
    name: github
  credentialsRef:         # optional — Secret with privateKey, username, password, …
    name: my-app-repo-credentials
    namespace: infra
```

| Field | Purpose |
|---|---|
| `spec.url` | HTTPS or SSH git URL — **immutable** after creation |
| `spec.connectionRef` | Existing SCM connection for credentials |
| `spec.credentialsRef` | Direct Secret reference for repo auth |
| `status.health` | `PULLABLE` or `FAILED` — Console can reach the repo |

Find existing registrations in the GitOps repo:

```bash
grep -rl 'kind: GitRepository' manifests/
```

---

## How consumers use it

`ServiceDeployment` and `InfrastructureStack` point at a `GitRepository` via `repositoryRef`,
then specify **where inside that repo** to read with `spec.git`:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: my-app-prod
  namespace: infra
spec:
  cluster: prod-eu-1
  repositoryRef:
    name: my-app-repo
  git:
    ref: main
    folder: deploy/k8s
  namespace: my-app
```

| Field | Purpose |
|---|---|
| `repositoryRef.name` | Name of the `GitRepository` CR |
| `spec.git.ref` | Branch, tag, or commit |
| `spec.git.folder` | Subdirectory with manifests, chart, or Terraform |

**Inline URL** (no `GitRepository` CR) is also supported — set `spec.git.url` directly on the
consumer CR instead of `repositoryRef`.

---

## Working in an unfamiliar repo

**If you are in the GitOps repo** — read `manifests/` for `GitRepository`, `ServiceDeployment`,
and `Cluster` CRs. Use `Cluster` resources with `apiVersion: deployments.plural.sh/v1alpha1`
(not CAPI `cluster.x-k8s.io`) to find valid `spec.handle` values for `spec.cluster`.

**If you are in a source repo** — find the matching `GitRepository.spec.url` and follow
`repositoryRef` + `spec.git.folder` on the consuming CRs in the GitOps repo's `manifests/`.

---

## Official docs

- [Management API Reference — GitRepository](https://docs.plural.sh/api-reference/kubernetes/management-api-reference)
- [Git-sourced services](https://docs.plural.sh/plural-features/continuous-deployment/git-service)
- [Deployment operator](https://docs.plural.sh/plural-features/continuous-deployment/deployment-operator)

Plural CD is **Flux-interoperable** for source types.
