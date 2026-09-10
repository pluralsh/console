---
title: Stack policies
description: Enforce and automate infrastructure stack approvals with Rego
---

Stack policies evaluate infrastructure plans before an approval-gated stack run proceeds. They can reject a run that violates a guardrail, automatically approve a known-safe plan, or leave the run undecided so it continues to the configured human or AI approval flow.

Stack policies use the `plrl.stack` Rego package.

## Supported input

Plural evaluates a stack policy with the following top-level input:

| Field | Description |
|---|---|
| `input.plan` | A reduced Terraform plan containing `terraform_version` and `resource_changes` |
| `input.run_type` | The run operation: `plan`, `apply`, or `destroy` |
| `input.stack` | Stack metadata, including its name, project, and Git configuration |
| `input.commit` | Metadata for the commit associated with the run |
| `input.actor` | The initiating user, including identity, service-account status, roles, and groups |
| `input.costs` | Infracost resources reported for the run, or an empty array when no cost data is available |
| `input.violations` | Vulnerability and misconfiguration findings reported for the run, or an empty array when none are available |

The `input.actor` object contains:

| Field | Type | Description |
|---|---|---|
| `id` | string | User ID |
| `name` | string | User display name |
| `email` | string | User email address |
| `service_account` | boolean | Whether the actor is a service account |
| `roles.admin` | boolean | Whether the actor is a Plural administrator |
| `groups` | string array | Names of the groups the actor belongs to |

Each entry in `input.plan.resource_changes` contains:

| Field | Description |
|---|---|
| `address` | Full Terraform resource address |
| `type` | Terraform resource type, such as `aws_eks_cluster` |
| `name` | Resource name |
| `provider_name` | Short provider name |
| `change.actions` | Planned actions, such as `create`, `update`, `delete`, or `replace` |
| `change.before` | Resource state before the run |
| `change.after` | Expected resource state after the run |

### Cost data

Each entry in `input.costs` contains:

| Field | Type | Description |
|---|---|---|
| `resource_scope` | string | Infracost scope: `breakdown`, `past_breakdown`, `diff`, or `free` |
| `project_name` | string or null | Infracost project containing the resource |
| `name` | string | Resource name, such as `aws_instance.web` |
| `resource_type` | string or null | Infrastructure resource type |
| `hourly_cost` | number or null | Estimated hourly cost |
| `monthly_cost` | number or null | Estimated monthly cost |
| `monthly_usage_cost` | number or null | Usage-based portion of the estimated monthly cost |
| `raw_resource` | object or null | Provider-specific details supplied by Infracost |

For example, a policy can reject a run when any resource adds more than $100 in estimated monthly cost:

```rego
deny[{"msg": sprintf("%s costs more than $100 per month", [cost.name])}] if {
	some cost in input.costs
	cost.resource_scope == "diff"
	cost.monthly_cost > 100
}
```

### Vulnerability data

Each entry in `input.violations` contains:

| Field | Type | Description |
|---|---|---|
| `severity` | string | Finding severity: `unknown`, `low`, `medium`, `high`, or `critical` |
| `policy_id` | string | Identifier of the policy that produced the finding |
| `policy_url` | string or null | URL with more information about the policy |
| `policy_module` | string or null | Policy module that produced the finding |
| `title` | string | Short finding title |
| `description` | string or null | Detailed description of the finding |
| `resolution` | string or null | Recommended remediation |
| `causes` | array | Source locations that caused the finding |

Each entry in a violation's `causes` array contains:

| Field | Type | Description |
|---|---|---|
| `resource` | string | Infrastructure resource associated with the finding |
| `filename` | string or null | Source file containing the finding |
| `start` | integer | First affected line |
| `end` | integer | Last affected line |
| `lines` | array | Affected source lines |

Each entry in `lines` contains `content` (string), `line` (integer), `first` (boolean or null), and `last` (boolean or null).

For example, a policy can reject runs with critical findings:

```rego
deny[{"msg": sprintf("critical finding: %s", [violation.title])}] if {
	some violation in input.violations
	violation.severity == "critical"
}
```

Cost and vulnerability data is only available when the stack runner reports it before the run reaches approval. Policies should treat the corresponding empty array as no reported data, not proof that a scan or estimate completed successfully.

## Decisions

A stack policy can produce:

- `deny[{"msg": "..."}]`: reject the stack run
- `approve[{"reason": "..."}]`: approve the stack run
- `defer`: leave the decision to the next configured approval step

If a policy produces neither a denial nor an approval, Plural also continues to the configured approval flow. This is useful for policies that only auto-approve a narrowly defined set of safe plans.

## Full example

The following policy denies destructive EKS changes and control-plane upgrades that skip more than one Kubernetes minor version. Plans without destructive changes or any version update are automatically approved, while single-minor upgrades continue to review:

```rego
package plrl.stack

eks_types := {"aws_eks_cluster", "aws_eks_node_group"}

destructive_actions := {"delete", "replace"}

destructive_eks_change if {
	some rc in input.plan.resource_changes
	eks_types[rc.type]
	some action in rc.change.actions
	destructive_actions[action]
}

cluster_version_update if {
	some rc in input.plan.resource_changes
	rc.type == "aws_eks_cluster"
	is_object(rc.change.before)
	is_object(rc.change.after)
	rc.change.before.version != rc.change.after.version
}

version_number(version) := numeric_version if {
	parts := split(version, ".")
	major := to_number(parts[0])
	minor := to_number(parts[1])
	numeric_version := major * 1000 + minor
}

cluster_version_skips_minor if {
	some rc in input.plan.resource_changes
	rc.type == "aws_eks_cluster"
	is_object(rc.change.before)
	is_object(rc.change.after)
	before_version := version_number(rc.change.before.version)
	after_version := version_number(rc.change.after.version)
	after_version > before_version + 1
}

deny[{"msg": "destroying or replacing EKS clusters and node groups is not allowed"}] if {
	destructive_eks_change
}

deny[{"msg": "EKS control-plane upgrades cannot skip Kubernetes minor versions"}] if {
	cluster_version_skips_minor
}

approve[{"reason": "no destructive EKS cluster or node group changes and no cluster version update"}] if {
	not destructive_eks_change
	not cluster_version_update
}
```

The `deny` rules reject prohibited plans and record a specific explanation. A one-minor control-plane upgrade is not denied, but it also does not match the approval rule, so it continues to human or AI review. Plans without an EKS version change or destructive EKS action receive an explicit approval.

## Attach a policy to stacks

You can attach a stack policy in either of two ways:

1. Open **Security → Policies**, select the stack policy, and use the **Attachments** tab to attach it to a stack.
2. Create a binding policy that selects stacks dynamically, then connect the binding policy to the stack policy.

A binding policy uses `plrl.binding` and returns `bind`:

```rego
package plrl.binding

bind if {
	startswith(input.stack.name, "cluster-")
}
```

Plural evaluates binding policies when matching resources change and on their configured interval. A `true` result attaches the enforcement policy; a `false` result removes an attachment previously managed by that binding.

The same configuration can be managed with Terraform:

```hcl
resource "plural_policy" "eks_guardrails" {
  name        = "eks-guardrails"
  type        = "STACK"
  description = "Reject unsafe EKS changes and auto-approve plans without destructive or version changes."
  project_id  = data.plural_project.project.id
  policy      = file("${path.module}/policies/stack/eks_guardrails.rego")
}

resource "plural_policy" "cluster_stacks" {
  name        = "cluster-stacks"
  type        = "BINDING"
  description = "Select stacks whose names begin with cluster-."
  project_id  = data.plural_project.project.id
  policy      = file("${path.module}/policies/binding/cluster_stacks.rego")
}

resource "plural_binding_policy" "eks_guardrails_for_clusters" {
  policy_id      = plural_policy.eks_guardrails.id
  bind_policy_id = plural_policy.cluster_stacks.id
  type           = "STACK"
  interval       = "6h"
}
```

See the [complete stack example](https://github.com/pluralsh/policy-examples/tree/main/policies/stack) for its tests and deployment configuration.
