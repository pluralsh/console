---
title: Stack policies
description: Block stack runs before they start, or approve and reject infrastructure plans with Rego
---

Stack policies use the `plrl.stack` Rego package. They evaluate at one of two stages:

| Stage | When it runs | Effect of `deny` | Effect of `approve` |
|---|---|---|---|
| Run | Before a stack run is created | The run is not created | Ignored |
| Approval | After plan, when the run is waiting for approval | The run is rejected | The run is approved |

Attach the same policy at both stages when you want both behaviors. Use `input.stage` (`run` or `approval`) so each rule applies to the intended evaluation.

## Run stage

Run-stage policies decide whether Plural should create a stack run at all. Typical uses are release windows, blocked committers, and required variables, environment, or files.

A denial is the only decision that changes behavior. If the policy produces no denial, the run is created and later approval-stage policies still apply.

When a git or pull-request poll is denied, Plural does not consume the detected SHA, so the same commit is retried after the window reopens. Cron denials still stamp the last-run time. Manual and restart denials return the policy message to the caller.

If policy compilation or evaluation fails, run creation continues. Treat that as fail-open: a broken policy will not freeze every stack.

### Run-stage input

| Field | Description |
|---|---|
| `input.stage` | Always `run` |
| `input.now` | Current time as an RFC 3339 timestamp, for freeze windows |
| `input.trigger.source` | Why the run was requested: `git`, `pr`, `cron`, `manual`, `restart`, or `destroy` |
| `input.actor` | The initiating user, including identity, service-account status, roles, and groups |
| `input.stack` | Stack metadata, including its name, project, Git configuration, and variables |
| `input.commit` | Commit SHA, message, and committer for the proposed run |
| `input.run` | Intended run flags: `dry_run`, `destroy`, and `pull_request` |
| `input.variables` | Stack variables |
| `input.environment` | Stack environment variables. Secret values are omitted; only `name` and `secret: true` are present |
| `input.files` | Stack file paths. File contents are omitted |
| `input.changes` | Paths changed in git since the last run, when the trigger supplies them |

The `input.actor` object contains:

| Field | Type | Description |
|---|---|---|
| `id` | string | User ID |
| `name` | string | User display name |
| `email` | string | User email address |
| `service_account` | boolean | Whether the actor is a service account |
| `roles.admin` | boolean | Whether the actor is a Plural administrator |
| `groups` | string array | Names of the groups the actor belongs to |

### Run-stage examples

Deny production applies during a weekend freeze:

```rego
package plrl.stack

deny[{"msg": "production stacks cannot run during the weekend freeze"}] if {
	input.stage == "run"
	not input.run.destroy
	not input.run.dry_run
	frozen
}

frozen if {
	ns := time.parse_rfc3339_ns(input.now)
	dow := time.weekday(ns)
	dow in {0, 6}
}
```

Block automated committers from spawning runs:

```rego
package plrl.stack

blocked_committers := {"dependabot[bot]", "renovate[bot]"}

deny[{"msg": sprintf("committer %s is not allowed to spawn stack runs", [input.commit.committer])}] if {
	input.stage == "run"
	blocked_committers[input.commit.committer]
}
```

Require a variable before a run is created:

```rego
package plrl.stack

deny[{"msg": "cluster_name must be set"}] if {
	input.stage == "run"
	not input.variables.cluster_name
}
```

## Approval stage

Approval-stage policies evaluate infrastructure plans before an approval-gated stack run proceeds. They can reject a run that violates a guardrail, automatically approve a known-safe plan, or leave the run undecided so it continues to the configured human or AI approval flow.

### Approval-stage input

| Field | Description |
|---|---|
| `input.stage` | Always `approval` |
| `input.now` | Current time as an RFC 3339 timestamp |
| `input.plan` | A reduced Terraform plan containing `terraform_version` and `resource_changes` |
| `input.run_type` | The run operation: `plan`, `apply`, or `destroy` |
| `input.stack` | Stack metadata, including its name, project, Git configuration, and variables |
| `input.commit` | Metadata for the commit associated with the run |
| `input.actor` | The initiating user, including identity, service-account status, roles, and groups |
| `input.costs` | Infracost resources reported for the run, or an empty array when no cost data is available |
| `input.violations` | Vulnerability and misconfiguration findings reported for the run, or an empty array when none are available |
| `input.run` | Run flags: `dry_run`, `destroy`, and `pull_request` |
| `input.variables` | Stack or run variables |
| `input.environment` | Run environment variables. Secret values are omitted |
| `input.files` | Run file paths. File contents are omitted |

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

- `deny[{"msg": "..."}]`: reject the proposed run (run stage) or reject the planned run (approval stage)
- `approve[{"reason": "..."}]`: approve the stack run at the approval stage. Ignored at the run stage
- `defer`: leave the approval-stage decision to the next configured approval step

If a run-stage policy produces no denial, Plural creates the run. If an approval-stage policy produces neither a denial nor an approval, Plural continues to the configured approval flow. This is useful for policies that only auto-approve a narrowly defined set of safe plans.

## Full example

The following approval-stage policy denies destructive EKS changes and control-plane upgrades that skip more than one Kubernetes minor version. Plans without destructive changes or any version update are automatically approved, while single-minor upgrades continue to review:

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
	input.stage == "approval"
	destructive_eks_change
}

deny[{"msg": "EKS control-plane upgrades cannot skip Kubernetes minor versions"}] if {
	input.stage == "approval"
	cluster_version_skips_minor
}

approve[{"reason": "no destructive EKS cluster or node group changes and no cluster version update"}] if {
	input.stage == "approval"
	not destructive_eks_change
	not cluster_version_update
}
```

The `deny` rules reject prohibited plans and record a specific explanation. A one-minor control-plane upgrade is not denied, but it also does not match the approval rule, so it continues to human or AI review. Plans without an EKS version change or destructive EKS action receive an explicit approval.

## Attach a policy to stacks

You can attach a stack policy in either of two ways:

1. Open **Security → Policies**, select the stack policy, and use the **Attachments** tab to attach it to a stack.
2. Create a binding policy that selects stacks dynamically, then connect the binding policy to the stack policy. Set the evaluation stage to **Run** or **Approval** (the default).

A binding policy uses `plrl.binding` and returns `bind`:

```rego
package plrl.binding

bind if {
	startswith(input.stack.name, "cluster-")
}
```

Plural evaluates binding policies when matching resources change and on their configured interval. A `true` result attaches the enforcement policy at the configured stage; a `false` result removes an attachment previously managed by that binding. The same stack policy can be attached as both `RUN` and `APPROVAL` by two binding policies.

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

Or with a `BindingPolicy` CRD. Set `spec.matches.stack.type` to `RUN` or `APPROVAL`:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: BindingPolicy
metadata:
  name: freeze-window-for-clusters
spec:
  type: STACK
  interval: 6h
  policyRef:
    name: weekend-freeze
  bindPolicyRef:
    name: cluster-stacks
  matches:
    stack:
      type: RUN
```

See the [complete stack example](https://github.com/pluralsh/policy-examples/tree/main/policies/stack) for its tests and deployment configuration.
