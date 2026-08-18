# Workbench Policy Enforcement — IA & wireframes

Clickable prototype: open [`index.html`](./index.html) in a browser. Static captures of the main screens live in [`screenshots/`](./screenshots/).

These screens map the [programmable policy backend](https://github.com/pluralsh/console/pull/4014) onto Console IA. Policies are first-class, project-scoped objects (not buried in a workbench), then attached the same way chatbot and webhook connections are: **create globally, bind locally**.

## Why this IA

| Constraint | Decision |
| --- | --- |
| Gatekeeper constraints are k8s OPA policies, not this system | Rename Security → **Policies** to **Gatekeeper**. New **Policies** nav item owns CRUD for `Policy`. |
| Horizontal tabs on Security are already crowding | Replace top `SubTab`s with the Settings-style **sidenav** (`GridLayoutWithSideNav` + `SideNavEntries`). |
| Policies will grow types (`workbench`, `stack`, `binding`) and bind to more than workbenches | Keep them under **Security**, not Settings and not only on a workbench. |
| Workbench attach should feel like chatbot / webhook | Global list + create in Security. Workbench has list / attach / edit of `WorkbenchPolicy` rows, with “Manage policies” linking out. |

```
Security (sidenav)
├── Overview
├── Policies          ← NEW (Policy CRUD, evaluations, simulate)
├── Gatekeeper        ← renamed from Policies
├── Vulnerability reports
└── Compliance reports

Workbench
├── ⋯ menu → Policies
├── Side panel → Policies section
└── /workbenches/:id/policies
    ├── list / empty
    ├── create (attach existing Policy)
    └── :workbenchPolicyId/edit
```

## Data model (from PR 4014)

```
Policy                        project-scoped source of truth
├── name                      unique, usually a filename with .rego
├── type                      WORKBENCH | STACK | BINDING
├── description
├── policy                    Rego body (validated on save)
├── project
├── policyEvaluations[]       sampled input/output
└── workbenchPolicies[] / bindingPolicies[] / stackPolicies[]

WorkbenchPolicy               attachment (unique per policy + workbench)
├── policy
├── workbench
└── matches
    ├── regexes[]             tool-name regexes; empty → all tools
    └── ignore[]              tool names skipped even if a regex matches

PolicyEvaluation              sampled decision (kept ~1 week)
├── policyIds[]               policies that ran together
├── input                     JSON tool payload (+ actor)
└── output                    { sample, deny[], approve[] }
```

Matching (any matching policy that **denies** rejects the tool call):

1. If `ignore` contains the tool name → skip this policy.
2. If `regexes` is non-empty → apply only when any regex matches the tool name.
3. Otherwise the policy applies to every tool.

Runtime input passed to Rego:

```json
{
  "input": { "...tool arguments..." },
  "actor": { "id": "...", "name": "...", "email": "...", "groups": ["platform"] }
}
```

Workbench admission result (`priv/policy/wb.rego`):

```json
{
  "sample": 0.5,
  "deny": [{ "reason": "kube.exec is not allowed in prod" }],
  "approve": []
}
```

`deny` with any items → reject. `approve` with items can auto-approve a pending tool. `sample` (clamped 0–0.5) decides whether this evaluation is persisted for the workbench.

## GraphQL surfaces the UI uses

**Security / Policies**

| Screen | Operations |
| --- | --- |
| List | `policies(projectId, q)` |
| Create | `createPolicy(attributes: { name, type, description, policy, projectId })` |
| Edit / save body | `updatePolicy(id, attributes)` |
| Delete | `deletePolicy(id)` |
| Detail | `policy(id)` |
| Evaluations | `policy.policyEvaluations` |
| Simulate | `evaluatePolicy(policyId, input)` against a past evaluation’s `input`, using the **current** (possibly unsaved) body after save, or the stored body |

**Workbench attach**

| Screen | Operations |
| --- | --- |
| List | `workbench.workbenchPolicies` |
| Attach | `createWorkbenchPolicy(workbenchId, attributes: { policyId, matches })` |
| Edit matches | `updateWorkbenchPolicy(id, attributes: { matches })` |
| Detach | `deleteWorkbenchPolicy(id)` |
| Policy picker | `policies(projectId, q)` filtered to `type: WORKBENCH` |

`matches.ignore` exists on the Ecto schema and in matching logic, but the GraphQL `WorkbenchPolicyMatches` object currently only exposes `regexes`. The attach form still shows ignore names; implementing it requires adding `ignore` to the GraphQL matches input/object.

## Interaction notes

**Create vs attach.** Same split as chatbots: Security owns the Rego document. A workbench never authors policy source; it only picks a policy and scoping (regexes / ignore). Empty match fields mean “all tools on this workbench.”

**Editor.** Policy detail is a Monaco `CodeEditor`. There is no bundled Rego language in Monaco today — register a lightweight `rego` tokenizer (keywords `package`, `import`, `if`, `contains`, `default`, `deny`, `approve`, `sample`) rather than falling back to plaintext.

**Evaluations + simulate.** This is the Spacelift policy workbench loop: sampled production inputs, inspect JSON in/out, re-run against the current body without waiting for another job. Simulate should show original output vs new output so a deny→allow (or the reverse) is obvious before save.

**Multiple policies.** The list and attach form copy should say that several attachments can target the same tool, and **any deny wins**.

**Types.** `type` is on `Policy` now (`workbench` default). The list filters by type. Stack binding is a later attach surface; do not hide the type field.

**Binding policies (backend-only for v1).** `BindingPolicy` can auto-attach a policy to workbenches/stacks using a second Rego document (`bind: true/false`) on an interval. Not in these screens. When we add it, it belongs under Security → Policies as a secondary object (policy detail → Bindings), not as another Security top-level item.

## Screen inventory

| # | Screen | Route |
| --- | --- | --- |
| 1 | Security overview (new sidenav) | `/security/overview` |
| 2 | Policies list | `/security/policies` |
| 3 | Policies empty | `/security/policies` |
| 4 | Create policy | `/security/policies/create` |
| 5 | Policy body editor | `/security/policies/:id` |
| 6 | Policy evaluations | `/security/policies/:id/evaluations` |
| 7 | Simulate evaluation | `/security/policies/:id/evaluations/:evalId` |
| 8 | Gatekeeper (renamed) | `/security/gatekeeper` |
| 9 | Workbench policies list | `/workbenches/:id/policies` |
| 10 | Workbench policies empty | `/workbenches/:id/policies` |
| 11 | Attach / edit policy | `/workbenches/:id/policies/create` |
| 12 | Workbench launch + side panel + ⋯ menu | `/workbenches/:id` |
