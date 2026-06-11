# Plural GitOps Skills

Agent skills for Plural-managed GitOps repositories. Each skill is a directory with a
`SKILL.md` file (YAML frontmatter + markdown body) following the
[Claude Code skills format](https://code.claude.com/docs/en/skills). The agent harness
symlinks them into each runtime's skills discovery path at pod startup.

## Architecture (read this once)

Plural CD uses **two cooperating layers**:

1. **Management controller** (`go/controller`, runs on the mgmt cluster) — watches GitOps CRDs,
   syncs them to the Plural Console API. It is a **frontend**: it does not apply workloads to
   fleet clusters directly.
2. **Deployment operator agent** (runs on each target cluster) — pulls service definitions from
   Console, renders Helm/Kustomize/raw YAML, and applies manifests locally.

**CRD field reference**: for authoritative `spec` / `status` definitions of every
`deployments.plural.sh/v1alpha1` kind, use the
[Management API Reference](https://docs.plural.sh/api-reference/kubernetes/management-api-reference).
Agent-side CRDs are documented separately in the
[Agent API Reference](https://docs.plural.sh/api-reference/kubernetes/agent-api-reference).

## Skills

| Skill | When to use |
|---|---|
| `plural-git-repository` | GitRepository CRs, source vs GitOps repos, `repositoryRef` / `spec.git` |
| `plural-infrastructure-stack` | InfrastructureStack CRs, Terraform / Terragrunt / Ansible runs |
| `plural-services` | ServiceDeployment vs GlobalService |
| `plural-cd-extensions` | Advanced CD patterns from official docs |

## Runtime discovery paths

The harness links bundled skills from `/plural/skills/<name>/` into:

| Runtime | Work dir | Cloned repo (when separate) |
|---|---|---|
| Claude | `.claude/skills/` | `.claude/skills/` |
| Codex | `.codex/skills/` | `.agents/skills/` |
| Gemini | `.gemini/skills/` | `.agents/skills/` |
| OpenCode | `.opencode/skills/` | `.claude/skills/`, `.agents/skills/` |

Codex requires `[features] skills = true` in its config (set by the harness).

## Quick-start checklist

Before editing any YAML in a Plural GitOps repo:

1. **Load `plural-git-repository`** to understand how this repo relates to GitOps CRs and source repos.
2. **Identify the CR kind** you are modifying. For field-level specs, check the
   [Management API Reference](https://docs.plural.sh/api-reference/kubernetes/management-api-reference).
3. **Load the matching skill** for that kind.
4. **If using advanced CD patterns**, load `plural-cd-extensions` and follow the linked official docs.
5. **Check existing CRs** in `manifests/` for namespace and naming conventions — follow the same pattern.
6. **Check read-only resources** — if `.status.readonly: true` on a Cluster (or similar), the
   CR is observed from Console/Terraform and **must not** be edited as the write path; update
   the upstream source instead.
