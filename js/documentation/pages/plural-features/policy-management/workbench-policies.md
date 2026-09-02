---
title: Workbench policies
description: Control and approve workbench tool calls with Rego guardrails
---

Workbench policies evaluate each matching tool call made by a workbench agent. They extend Plural RBAC and tool permissions with authorization rules that understand the current actor, the requested tool, and its arguments.

Workbench policies use the `plrl.wb.admission` Rego package.

{% callout severity="info" %}
A policy cannot make an unavailable tool accessible or grant permissions the actor does not already have. It adds guardrails to the existing workbench authorization model.
{% /callout %}

## Supported input

| Field | Description |
|---|---|
| `input.tool_name` | Name of the tool being called |
| `input.tool` | Arguments supplied to the tool, represented as an object |
| `input.actor` | Current user, including `id`, `name`, `email`, and a `groups` array when available |

The shape of `input.tool` depends on the tool. For example, a Kubernetes operation can include a `namespace`, while a logging tool can include an index and query. Select a past evaluation in the [policy simulator](/plural-features/policy-management/simulating-policies) to inspect the real input for a tool before writing rules against it.

## Decisions

A workbench policy can produce:

- `deny[{"msg": "..."}]`: block the tool call and return the denial message
- `approve[{"reason": "..."}]`: automatically approve a tool that supports approval and record the reason

A denial takes precedence when multiple rules or attached policies produce decisions. If no rule produces a decision, the tool continues through its normal authorization and approval path.

## Full example

This policy blocks non-SRE users from deleting resources in `kube-system` and automatically approves SRE updates outside that namespace:

```rego
package plrl.wb.admission

actor_is_sre if {
	input.actor.groups[_] == "sre"
}

deny[{"msg": "deleting resources in the kube-system namespace is not allowed"}] if {
	input.tool_name == "delete_k8s_resource"
	input.tool.namespace == "kube-system"
	not actor_is_sre
}

approve[{"reason": "SREs may update resources outside the kube-system namespace"}] if {
	input.tool_name == "update_k8s_resource"
	input.tool.namespace != "kube-system"
	actor_is_sre
}
```

Use exact tool names and validate the argument shape from a real evaluation. Different integrations can model similar operations with different fields.

## Attach a policy to workbenches

You can attach a workbench policy in either of two ways:

1. Open **Security → Policies**, select the workbench policy, and use the **Attachments** tab to attach it to a workbench. Configure tool matches on the attachment when the policy should only evaluate selected tool names.
2. Use a binding policy to attach it automatically to workbenches matching a naming or metadata convention.

For example, this binding policy selects workbenches whose names start with `demo-`:

```rego
package plrl.binding

bind if {
	startswith(input.workbench.name, "demo-")
}
```

Plural evaluates binding policies when workbenches change and on their configured interval. A `true` result attaches the enforcement policy; a `false` result removes an attachment previously managed by that binding.

The policy and binding can be managed with Terraform:

```hcl
resource "plural_policy" "kubernetes_guardrails" {
  name        = "kubernetes-guardrails"
  type        = "WORKBENCH"
  description = "Guard Kubernetes deletes and approve safe SRE updates."
  project_id  = data.plural_project.project.id
  policy      = file("${path.module}/policies/workbench/kubernetes_guardrails.rego")
}

resource "plural_policy" "demo_workbenches" {
  name        = "demo-workbenches"
  type        = "BINDING"
  description = "Select workbenches whose names begin with demo-."
  project_id  = data.plural_project.project.id
  policy      = file("${path.module}/policies/binding/demo_workbenches.rego")
}

resource "plural_binding_policy" "kubernetes_guardrails_for_demos" {
  policy_id      = plural_policy.kubernetes_guardrails.id
  bind_policy_id = plural_policy.demo_workbenches.id
  type           = "WORKBENCH"
  interval       = "6h"
}
```

See the [complete workbench example](https://github.com/pluralsh/policy-examples/tree/main/policies/workbench) for its tests and deployment configuration.
