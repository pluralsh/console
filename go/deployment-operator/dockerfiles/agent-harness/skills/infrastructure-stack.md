# InfrastructureStack — Terraform / IaC Mapping

`InfrastructureStack` is the Plural GitOps CRD for IaC. Each CR maps to **stack runs** in
Console that the deployment-operator executes as **Batch Jobs** on `spec.clusterRef` (commonly
the management cluster).

The management controller syncs the CR to Console; the operator runs plan/apply on git changes,
cron, or manual trigger — it does not continuously reconcile cloud resources like a k8s
controller.

This document explains the field-level mapping so you can create, read, and modify stacks
correctly.

---

## Minimal Terraform stack

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: InfrastructureStack
metadata:
  name: vpc-prod-eu
  namespace: infra
spec:
  type: TERRAFORM          # IaC tool: TERRAFORM | TERRAGRUNT | ANSIBLE | CUSTOM
  repositoryRef:
    name: infra-repo       # GitRepository CR name
    namespace: infra
  git:
    ref: main              # Branch, tag, or commit SHA
    folder: terraform/vpc  # Path inside the repo containing .tf files
  clusterRef:
    name: mgmt             # Cluster where the job pod runs (often mgmt, not workload cluster)
    namespace: infra
  manageState: true        # Plural provisions remote state (optional)
```

---

## Type → tool mapping

| `spec.type`  | Binary executed | Notes |
|---|---|---|
| `TERRAFORM`  | `terraform` (or `tofu` if `configuration.terraform.tofu: true`) | Standard HCL, state managed by Plural or remote backend |
| `TERRAGRUNT` | `terragrunt` | Wraps Terraform; supports HCL-based DRY configs |
| `ANSIBLE`    | `ansible-playbook` | Requires `configuration.ansible.playbook` |
| `CUSTOM`     | User-supplied image | Full control; no automatic `plan`/`apply` lifecycle |

---

## `spec.git` — locating the IaC source

```yaml
git:
  ref: main            # Git ref to check out
  folder: terraform/vpc  # Subdirectory of the repo to use as working directory
```

- The operator checks out `ref` and `cd`s into `folder` before running the tool.
- Use `spec.workdir` as an **override** if the entry-point differs from `git.folder` (e.g.
  for Terragrunt repos with external modules that must be run from a parent dir).

---

## `spec.stackDefinitionRef` — reusable stack scaffold

Point at a `StackDefinition` CR for shared configuration (tool version, hooks, defaults)
instead of duplicating `spec.configuration` on every stack.

---

## `spec.configuration` — tool version & hooks

```yaml
configuration:
  version: "1.9.0"           # Pin Terraform/Terragrunt version (image tag)
  image: "hashicorp/terraform" # Override default tool image

  terraform:
    parallelism: 10           # -parallelism flag
    refresh: true             # -refresh flag
    approveEmpty: true        # Auto-approve when plan has zero changes
    tofu: true                # Use OpenTofu instead of Terraform
    tofuRegistry: true        # Use OpenTofu registry for providers/modules

  terragrunt:
    parallelism: 10
    refresh: true
    approveEmpty: true

  ansible:
    playbook: site.yml        # Playbook to run
    inventory: hosts.ini      # Inventory file (relative to git.folder)
    additionalArgs: ["-v"]
    privateKeyFile: /secrets/id_rsa
    configFile: ansible.cfg
    supportsCheck: true       # Whether --check mode is supported
    deletePlaybook: delete.yml # Playbook run on stack deletion

  hooks:
    - cmd: "pre-plan.sh"
      afterStage: INIT        # INIT | PLAN | APPLY | DESTROY | ...
```

---

## `spec.manageState` — Plural-managed Terraform state

When `true`, Plural provisions and manages an S3/GCS-backed remote state bucket automatically.
When `false` (default), your Terraform code must configure a `backend {}` block to point at
an external state store.

---

## `spec.variables` — variable file injection

Arbitrary YAML/JSON injected as a variables file before the IaC run. For Terraform this
becomes a `.tfvars.json` file; for Ansible it becomes extra vars.

```yaml
variables:
  region: eu-west-1
  instance_count: 3
```

---

## `spec.environment` — environment variable injection

```yaml
environment:
  - name: TF_LOG
    value: DEBUG
  - name: AWS_ROLE_ARN
    secretRef:               # Pull from a Kubernetes Secret
      name: aws-creds
      key: role_arn
```

---

## `spec.files` — mounting credential files

```yaml
files:
  - mountPath: /root/.aws/credentials
    secretRef:
      name: aws-credentials  # Secret key must be the file content
```

This is the escape hatch for tools that read credentials from files rather than env vars.
IRSA / Workload Identity is preferred where available.

---

## `spec.approval` — human gate before apply

When `approval: true`, a plan is generated and the run pauses until a Plural Console user
approves it. Set this for production stacks where a human review of the diff is required.

---

## `spec.detach` — deletion behavior

- `detach: false` (default): deleting the CR triggers a `terraform destroy` run.
- `detach: true`: deleting the CR removes it from Plural Console but leaves cloud resources
  in place.

---

## `spec.cron` — scheduled runs

```yaml
cron:
  cron: "0 6 * * *"   # Standard cron expression
  autoApprove: true    # Skip approval gate for scheduled runs
```

---

## Stack run lifecycle

```
InfrastructureStack CR created/updated (GitOps repo)
        │
        ▼
   Management controller → Console InfrastructureStack
        │
        ▼
   Git commit / cron / manual trigger → StackRun (PENDING → RUNNING → …)
        │
        ▼
   deployment-operator creates StackRunJob → Batch Job on spec.clusterRef cluster
   ┌─────────────────────────────────┐
   │  git clone + cd git.folder      │
   │  terraform init                 │
   │  terraform plan  ──► (approval) │
   │  terraform apply                │
   └─────────────────────────────────┘
        │
        ▼
   Outputs in Console → available via ServiceDeployment.spec.imports
```

---

## Importing stack outputs into ServiceDeployments

```yaml
spec:
  imports:
    - stackRef:
        name: vpc-prod-eu
        namespace: infra
```

In Liquid templates, outputs appear under `imports.<stack-name>.<output-name>` (see
`services.md`).

---

## Service-of-services (IaC + CD composition)

A `ServiceDeployment` can sync a git folder containing **other** Plural CRs (including more
`InfrastructureStack` / `ServiceDeployment` YAML). This batches complex provisioning into one
git-driven tree. See
[git-sourced services](https://docs.plural.sh/plural-features/continuous-deployment/git-service).

---

## Common mistakes

| Mistake | Fix |
|---|---|
| `git.folder` points at the repo root when `.tf` files are in a subdirectory | Set `git.folder: terraform/<module>` |
| Wrong `clusterRef` — pointing at a workload cluster with no operator | Use the management cluster handle (`mgmt`) unless the workload cluster has the operator installed |
| Missing backend block with `manageState: false` | Either set `manageState: true` or add a `terraform { backend "s3" {} }` block |
| Secrets in `spec.variables` | Use `spec.environment[*].secretRef` or `spec.files` instead |

---

## Official docs references

- [Management API Reference](https://docs.plural.sh/api-reference/kubernetes/management-api-reference) — `InfrastructureStack`, `StackDefinition`, and related field specs
- Continuous deployment overview:
  https://docs.plural.sh/plural-features/continuous-deployment
- Deployment operator behavior:
  https://docs.plural.sh/plural-features/continuous-deployment/deployment-operator
- Reconciliation modes (creation/read-only):
  https://docs.plural.sh/plural-features/continuous-deployment/management-controllers-reconciliation-logic

When stack-adjacent resources are primarily managed by Terraform/Terragrunt, keep ownership
clear: use `InfrastructureStack` as the write path for IaC, and avoid conflicting direct
edits from unrelated CD resources.

