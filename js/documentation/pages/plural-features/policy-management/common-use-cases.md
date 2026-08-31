---
title: Common policy use cases
description: Patterns for governing workbench tools and infrastructure stack approvals
---

Policies are most useful when they encode a narrow, explainable rule around a high-impact operation. Start with guardrails that can be evaluated from explicit input fields, then expand coverage as you observe real evaluations in the simulator.

## Workbench policies

### Extend authorization for external tools

Many external systems have coarse authorization models: a credential may allow access to an entire observability account, log index, or API even when a user only needs a subset. Workbench policies can add request-level controls without issuing a separate credential for every user and use case.

Examples include:

- Restricting production log searches to an incident-response group
- Denying queries against sensitive audit or customer-data indices
- Limiting observability queries to approved accounts, services, or time ranges
- Preventing write operations through an external API while permitting reads

Policy input includes both the actor and tool arguments, allowing the decision to account for who is requesting the action and exactly what the agent plans to send.

### Increase autonomy with safe-action allowlists

Agents are most useful when routine, reversible actions can proceed without waiting for a human. Add `approve` rules for a well-defined set of safe operations while leaving everything else on the normal approval path.

Examples include:

- Approving restarts of stateless workloads outside protected namespaces
- Approving read-only diagnostic or observability calls
- Allowing an SRE group to update non-production resources
- Automatically posting summaries to a designated incident channel

Prefer explicit conditions on tool name and arguments over broad actor-only approvals. A narrow allowlist keeps autonomy predictable as new tools and operations are added.

### Guarantee operational best practices

Workbench policies apply the same safeguards to every matching workbench, regardless of its prompt or the model running it.

Examples include:

- Blocking Kubernetes deletes in system namespaces
- Requiring production mutations to originate from an approved group
- Denying changes that omit required ownership, ticket, or incident metadata
- Preventing access to regulated datasets from general-purpose workbenches

Use binding policies to attach these guardrails automatically based on workbench naming or metadata conventions.

## Stack policies

### Enforce change-management requirements

Inspect the actor, stack, commit, run type, and plan to require the evidence your organization expects before infrastructure changes proceed.

Examples include:

- Rejecting production applies without an approved change reference
- Restricting destroy runs to a designated operations group
- Requiring sensitive stacks to follow a specific repository or branch workflow
- Blocking changes during a freeze window when the required context is present in policy input

### Streamline approval of known-safe plans

Stack policies can automatically approve plans that fit a constrained risk profile and leave all other plans to a human or AI reviewer.

Examples include:

- Approving tag-only updates
- Approving additive changes to an allowed set of resource types
- Approving non-production plans below a defined size
- Approving EKS plans only when they do not destroy clusters or node groups and do not update the control-plane version

Model the safe case explicitly. If a plan does not satisfy every condition, return no approval and let the configured approval workflow handle it.

### Enforce compliance at scale

Evaluate every matching Terraform plan against controls derived from internal standards or regulatory frameworks.

Examples include:

- Requiring encryption and approved key-management configuration
- Denying public network exposure for protected workloads
- Enforcing required tags, retention settings, and backup policies
- Restricting resource types, providers, regions, or machine classes

Combine reusable stack policies with binding policies to apply controls across projects and stack families. Include a clear denial message that identifies the failed requirement and the expected remediation.

## Design recommendations

- Keep each rule focused on one decision and provide a specific reason.
- Use `deny` for requirements that must never be bypassed.
- Use `approve` only for operations whose complete safe boundary can be expressed from the available input.
- Leave uncertain cases undecided so existing human or AI approval remains in control.
- Test boundary conditions in Rego and replay representative live inputs in the [policy simulator](/plural-features/policy-management/simulating-policies).
