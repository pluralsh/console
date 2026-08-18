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

## Data model (GraphQL)

CRUD maps 1:1 to these types. Nested objects are selected, not duplicated.

```
Policy                         project-scoped source document
├── id
├── name                       String!
├── type                       PolicyType!   (WORKBENCH | STACK | BINDING)
├── description                String
├── policy                     String!       (Rego body)
├── project                    Project
├── policyEvaluations          PolicyEvaluationConnection
├── bindingPolicies            BindingPolicyConnection
├── insertedAt / updatedAt
└── (no workbenches field)

PolicyEvaluation               sampled decision; read-only
├── id
├── input                      Map!          (tool payload; may include actor)
├── output                     Map!          (deny[] / approve[] / sample)
├── policyIds                  [ID!]!        (one sample can cover many policies)
└── insertedAt / updatedAt

WorkbenchPolicy                attachment of a Policy to a Workbench
├── id
├── policy                     Policy        (selected, not authored here)
├── workbench                  Workbench
├── matches                    WorkbenchPolicyMatches
│   └── regexes                [String]      (only field; empty → all tools)
└── insertedAt / updatedAt
```

`WorkbenchPolicyMatches` does **not** expose `ignore`. Matching ignore exists on the Ecto schema only — do not put it in the attach form until it is on the API.

`Policy` does **not** expose workbench attachments. Those are listed from `workbench.workbenchPolicies`. Policy’s child connections are `policyEvaluations` and `bindingPolicies`.

There is no create/update/delete for `PolicyEvaluation`. Samples are written by the evaluator. The UI lists them and can call `evaluatePolicy(policyId, input)` to replay.

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
| Create | Details then Policy body (open text for `policy`). `createPolicy({ name, type, description, policy, projectId })` |
| Edit / save body | `updatePolicy(id, attributes)` |
| Delete | `deletePolicy(id)` |
| Detail | `policy(id)` |
| Evaluations | `policy.policyEvaluations` |
| Simulate | `evaluatePolicy(policyId, input)` against a past evaluation’s `input`, using the **current** (possibly unsaved) body after save, or the stored body |

**Workbench attach**

| Screen | Operations |
| --- | --- |
| List | `workbench.workbenchPolicies` → `WorkbenchPolicy { id policy matches updatedAt }` |
| Attach | `createWorkbenchPolicy(workbenchId, { policyId, matches: { regexes } })` |
| Edit matches | `updateWorkbenchPolicy(id, { matches: { regexes } })` — policy is immutable |
| Detach | `deleteWorkbenchPolicy(id)` |
| Policy picker | `policies(projectId, q)` filtered to `type: WORKBENCH` |

Policy list columns are `name`, `type`, `description`, `project`, `updatedAt`. Do not show last-evaluation as a Policy field.

Policy detail tabs are **Body** (`name`, `type`, `description`, `project`, `policy`) · **Evaluations** (`policyEvaluations`) · **Bindings** (`bindingPolicies`). Not a Workbenches tab.

Evaluations table columns are `insertedAt`, `policyIds`, `input`, `output`. Tool/actor/result are only inside those maps.

## `Policy.type` is place vs auto-attach

Do **not** flatten `WORKBENCH` / `STACK` / `BINDING` into one type chip as if they were three product areas.

| GraphQL value | What it is | List tab | Icon |
| --- | --- | --- | --- |
| `WORKBENCH` | Place the policy **runs** (tool admission on workbenches) | **Enforcement** (default) | `WorkbenchIcon` + “Runs on workbenches” |
| `STACK` | Place the policy **runs** (tool admission on stacks) | **Enforcement** | `StackIcon` + “Runs on stacks” |
| `BINDING` | **Auto-attach logic** (`BindingPolicy.bindPolicy`, `bind: true/false`). Not a third place. Not Console RBAC policy bindings. | **Auto-attach** | `LinksIcon` / `ArrowRightLeftIcon` + “Auto-attach · not a place” |

- Default list = Enforcement. Second tab = Auto-attach.
- Workbench attach picker = `type: WORKBENCH` only. Stack and BINDING policies are hidden.
- Create form groups type the same way: Enforcement (Workbench / Stack) vs Auto-attach (Binding). Opening create from the Auto-attach tab defaults to `BINDING`.

### Example auto-attach Rego

Copy from [`examples/binding/`](./examples/binding/). Every file must stay `package plrl.binding`. The evaluator merges them with `priv/policy/binding.rego` (`default bind := false`, `default sample := 0.5`) and reads `data.plrl.binding.result`.

Input is `Console.clean(workbench | stack)` — **no labels**. Useful fields:

| Target | Fields |
| --- | --- |
| Workbench (`preloaded [:project, :tools]`) | `name`, `description`, `project.name`, `project.default`, `configuration.infrastructure.kubernetes`, `configuration.coding.repositories`, `tools[].tool`, `budget.enabled` |
| Stack (`preloaded [:project]`) | `name`, `type`, `approval`, `paused`, `project.name` |

| File | Bind when |
| --- | --- |
| `auto-bind-all.rego` | Always (`bind := true`) |
| `auto-bind-prod-name.rego` | Name is `prod-*` or matches production |
| `auto-bind-production-project.rego` | `project.name == "production"` or default project |
| `auto-bind-sre-oncall.rego` | Name/description looks like SRE, on-call, incident |
| `auto-bind-kube-workbenches.rego` | Kubernetes infrastructure is enabled |
| `auto-bind-coding-prod-repos.rego` | A coding repo looks production-shaped |
| `auto-bind-cloud-tools.rego` | Attached tools include cloud / azure / lambda |
| `auto-bind-budgeted.rego` | Spend budget is enabled |
| `auto-bind-except-sandbox.rego` | Everything except sandbox / scratch / local-dev names |
| `auto-bind-terraform-stacks.rego` | Stack type is terraform or terragrunt |
| `auto-bind-approved-stacks.rego` | Stack requires approval and is not paused |

Do not redefine `default bind` in user Rego (conflicts with the base policy). Prefer `bind := true if …`.

## Interaction notes

**Create vs attach.** Security owns the `Policy` document (`createPolicy` / `updatePolicy` / `deletePolicy`). A workbench never authors `policy` source; it creates a `WorkbenchPolicy` that points at an existing `Policy` and sets `matches.regexes`. Empty regexes mean all tools.

**Editor.** Policy detail edits every writable Policy field, not just the Rego string: `name`, `type`, `description`, `projectId`, `policy`.

**Evaluations + simulate.** `PolicyEvaluation` is sampled JSON in/out plus `policyIds`. Simulate replays `input` through `evaluatePolicy`; it does not write a new evaluation.

**Edit attach.** `updateWorkbenchPolicy` only accepts `matches`. Changing which Policy is bound means delete + create.

**Types.** `Policy.type` is required (`WORKBENCH` default). Filter the list with Enforcement / Auto-attach tabs, not a flat type chip. Stack attach is a later surface.

**Bindings.** `Policy.bindingPolicies` is the Policy-level child for auto-attach. Manual workbench attach stays on the workbench.

## Screen inventory

| # | Screen | Route |
| --- | --- | --- |
| 1 | Security overview (new sidenav) | `/security/overview` |
| 2 | Policies list — Enforcement tab | `/security/policies` |
| 2b | Policies list — Auto-attach tab | `/security/policies` (`type: BINDING`) |
| 3 | Policies empty (same tabs) | `/security/policies` |
| 4 | Create policy (details + policy body text) | `/security/policies/create` |
| 5 | Policy body (all Policy fields) | `/security/policies/:id` |
| 5b | Auto-attach body + simulate bind | `/security/policies/:id` (`type: BINDING`) |
| 6 | Policy bindings | `/security/policies/:id/bindings` |
| 7 | Policy evaluations | `/security/policies/:id/evaluations` |
| 8 | Simulate evaluation | `/security/policies/:id/evaluations/:evalId` |
| 9 | Gatekeeper (renamed) | `/security/gatekeeper` |
| 10 | Workbench policies list | `/workbenches/:id/policies` |
| 11 | Workbench policies empty | `/workbenches/:id/policies` |
| 12 | Attach policy | `/workbenches/:id/policies/create` |
| 13 | Edit attach (matches only) | `/workbenches/:id/policies/:id/edit` |
| 14 | Workbench launch + side panel + ⋯ menu | `/workbenches/:id` |
