---
name: plural-cd-extensions
description: Advanced Plural CD patterns including service-of-services, multi-source services, Liquid/Lua templating, observers, and pipelines. Use when implementing advanced continuous deployment features in Plural GitOps.
---
# Official Continuous Deployment Extensions

This file maps common "advanced" Plural CD workflows to official docs so agents can quickly
jump from CRD basics to the right extension pattern.

Primary docs entrypoint:
- https://docs.plural.sh/plural-features/continuous-deployment

CRD field reference (all management kinds):
- https://docs.plural.sh/api-reference/kubernetes/management-api-reference

---

## Service-of-services (recursive GitOps)

Use this when one `ServiceDeployment` should apply a folder containing other
`deployments.plural.sh` objects (`ServiceDeployment`, `GlobalService`, `InfrastructureStack`, etc.).

Official docs:
- https://docs.plural.sh/plural-features/continuous-deployment/git-service

Agent guidance:
- Treat this as a composition/orchestration layer, not an app workload.
- Keep child objects in deterministic folder paths; avoid mixing unrelated environments.
- Expect reconciliation to overwrite manual edits to generated/child resources.

---

## GlobalService fleet templating

Use `GlobalService` when you need one service template replicated across many clusters,
with small per-cluster overrides.

Official docs:
- https://docs.plural.sh/plural-features/continuous-deployment/global-service
- https://docs.plural.sh/plural-features/continuous-deployment/service-templating

Agent guidance:
- Prefer `spec.template` + `spec.context.raw` for cluster-specific values.
- Use cluster metadata/tags for routing and Liquid variables for substitutions.
- If per-cluster behavior diverges heavily, split into multiple `ServiceDeployment`s.

---

## Multi-source services

Use this when one deployment needs manifests from multiple sources (for example,
operator chart from Helm + CRs from Git).

Official docs:
- https://docs.plural.sh/plural-features/continuous-deployment/multi-source-services

Agent guidance:
- Model each source explicitly via `spec.sources`.
- Control render behavior with `spec.renderers` by path.
- Keep source path boundaries clear to avoid accidental file shadowing.

---

## Dynamic Helm values via Lua

Use this for runtime generation of Helm values or value files from context.

Official docs:
- https://docs.plural.sh/plural-features/continuous-deployment/helm-service
- https://docs.plural.sh/plural-features/continuous-deployment/lua

Agent guidance:
- Keep Lua logic deterministic and side-effect free.
- Reserve Lua for cases where static values files or Liquid cannot express required logic.
- Document expected input context near the script.

---

## Resource application and sync behavior

Official docs:
https://docs.plural.sh/plural-features/continuous-deployment/resource-application-logic

Supported annotations on **any managed manifest**:

| Annotation | Effect |
|------------|--------|
| `deployment.plural.sh/sync-options: Replace=True` | Replace semantics (PUT) instead of server-side apply — drops fields absent from desired manifest |
| `deployment.plural.sh/sync-options: Force=True` | On apply failure (e.g. immutable field), delete and recreate |
| `deployment.plural.sh/sync-wave: "<n>"` | Apply ordering — lower numbers first |
| `argocd.argoproj.io/sync-options` | Argo CD-compatible alias (same semantics) |
| `argocd.argoproj.io/sync-wave` | Argo CD-compatible wave alias |

Hook delete policies and lifecycle hooks are also supported — see the full doc for
pre/post-sync hook resources.

Agent guidance:
- Use sync waves for strict ordering (CRDs → namespace → operator → app).
- Prefer minimal overrides; document non-obvious ordering in commit messages.

---

## Event-driven updates and promotion workflows

Use observers/pipelines when deployments should respond to upstream changes or environment
promotion rules.

Official docs:
- https://docs.plural.sh/plural-features/continuous-deployment/observer
- https://docs.plural.sh/plural-features/continuous-deployment/pipelines

Agent guidance:
- Use `Observer` for trigger detection (registry/git/other sources) and action execution.
- Use `Pipeline` for deterministic or AI-assisted promotion across environments.
- Keep promotion stages explicit and test-gated.

---

## Operator behavior and ownership boundaries

The deployment operator is an **API-driven frontend** — it automates Console provisioning and
applies manifests on clusters; it does not replace Terraform for cluster creation.

Official docs:
- https://docs.plural.sh/plural-features/continuous-deployment/deployment-operator
- https://docs.plural.sh/plural-features/continuous-deployment/management-controllers-reconciliation-logic

Agent guidance:
- **Creation mode** CRs: edit the GitOps YAML as the source of truth.
- **Read-only mode** (`.status.readonly: true`): resource owned elsewhere — update Terraform /
  Console directly, not the observing CR.
- Avoid conflicting writes: Terraform owns infra, Plural CD owns k8s app manifests unless
  explicitly composed via service-of-services.

