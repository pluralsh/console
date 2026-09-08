---
title: Policy enforcement
description: Extend Plural authorization and approval workflows with policy as code
---

Plural policies let platform and security teams encode enterprise guardrails in [Rego](https://www.openpolicyagent.org/docs/policy-language). Policies are evaluated alongside Plural's built-in RBAC and approval controls, adding organization-specific authorization without replacing the permissions you already configured.

Use policy enforcement to:

- Allow or deny workbench tool calls based on the actor, tool, and arguments
- Automatically approve known-safe workbench operations
- Approve or reject stack runs from the contents of an infrastructure plan
- Apply policies consistently to matching workbenches or stacks
- Test proposed policy changes against inputs captured from live evaluations

{% callout severity="info" %}
Policies only add constraints or automate an existing approval step. They do not grant access that the actor or workbench does not already have through Plural RBAC and tool permissions.
{% /callout %}

## Policy types

| Type | Rego package | Purpose |
|---|---|---|
| Workbench | `plrl.wb.admission` | Deny tool calls or automatically approve operations that require approval |
| Stack | `plrl.stack` | Approve or reject stack runs from plan, stack, commit, and actor data |
| Binding | `plrl.binding` | Select which workbenches or stacks receive another policy |

Workbench and stack policies return decisions. Binding policies return a `bind` decision and connect those enforcement policies to matching resources. This separation lets you reuse one guardrail across many workbenches or stacks without attaching it to each resource manually.

## Decision model

Workbench and stack policies can add objects to the `deny` and `approve` sets:

```rego
deny[{"msg": "explain why the operation is blocked"}] if {
	# conditions
}

approve[{"reason": "explain why the operation is safe"}] if {
	# conditions
}
```

A denial takes precedence over an approval. When no rule produces a decision:

- A workbench tool call continues through its normal authorization and approval path.
- A stack run continues to its configured human or AI approval path.


## Managing policies

Open **Security → Policies** in the Plural Console to create and edit policies, inspect attachments, review evaluations, and run simulations. Policies are project-scoped, allowing each project to apply guardrails appropriate to its resources and teams.

For a GitOps workflow, store policies and tests in Git and publish them with the [Plural Terraform provider](https://registry.terraform.io/providers/pluralsh/plural/latest/docs). The [Plural policy examples repository](https://github.com/pluralsh/policy-examples) demonstrates the complete workflow, including:

- Workbench, stack, and binding policies
- Rego unit tests and CI
- Terraform resources that publish and bind policies
- A Plural `InfrastructureStack` that deploys the configuration

## Next steps

- [Stack policies](/plural-features/policy-management/stack-policies)
- [Workbench policies](/plural-features/policy-management/workbench-policies)
- [Simulating and testing policies](/plural-features/policy-management/simulating-policies)
- [Common use cases](/plural-features/policy-management/common-use-cases)
