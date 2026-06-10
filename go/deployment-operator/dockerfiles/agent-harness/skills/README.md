# Plural GitOps Skills

Domain-knowledge reference files for AI coding agents working on Plural-managed GitOps
repositories. Read the relevant files **before** making changes.

## Architecture (read this once)

Plural CD uses **two cooperating layers**:

1. **Management controller** (`go/controller`, runs on the mgmt cluster) — watches GitOps CRDs,
   syncs them to the Plural Console API. It is a **frontend**: it does not apply workloads to
   fleet clusters directly.
2. **Deployment operator agent** (runs on each target cluster) — pulls service definitions from
   Console, renders Helm/Kustomize/raw YAML, and applies manifests locally.


**CRD field reference**: for authoritative `spec` / `status` definitions of every
`deployments.plural.sh/v1alpha1` kind (`Cluster`, `ServiceDeployment`, `GlobalService`,
`InfrastructureStack`, `Pipeline`, `Observer`, …), use the
[Management API Reference](https://docs.plural.sh/api-reference/kubernetes/management-api-reference).
Agent-side CRDs are documented separately in the
[Agent API Reference](https://docs.plural.sh/api-reference/kubernetes/agent-api-reference).

## Files

| File | When to read |
|---|---|
| [`git-repository.md`](git-repository.md) | Always — start here. How GitOps repos relate to source repos, `GitRepository` CRs, and `repositoryRef` / `spec.git` wiring. |
| [`infrastructure-stack.md`](infrastructure-stack.md) | When creating or modifying `InfrastructureStack` CRs, or any Terraform / Terragrunt / Ansible IaC runs. |
| [`services.md`](services.md) | When creating or modifying `ServiceDeployment` or `GlobalService` CRs, or deciding which one to use. |
| [`official-cd-extensions.md`](official-cd-extensions.md) | When you need advanced patterns from official docs: service-of-services, multi-source services, Lua Helm generation, sync controls, observers, and pipelines. |

## Quick-start checklist

Before editing any YAML in a Plural GitOps repo:

1. **Read `git-repository.md`** to understand how this repo relates to GitOps CRs and source repos.
2. **Identify the CR kind** you are modifying (`ServiceDeployment`, `GlobalService`,
   `InfrastructureStack`, etc.). For field-level specs, check the
   [Management API Reference](https://docs.plural.sh/api-reference/kubernetes/management-api-reference).
3. **Read the matching skill file** for that kind.
4. **If using advanced CD patterns**, read `official-cd-extensions.md` and follow the
   linked official docs for the specific feature.
5. **Check the existing CRs** in the repo for the namespace and naming convention already
   in use — follow the same pattern.
6. **Check read-only resources** — if `.status.readonly: true` on a Cluster (or similar), the
   CR is observed from Console/Terraform and **must not** be edited as the write path; update
   the upstream source instead.

