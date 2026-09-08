---
title: Stacks — IaC management
description: How to manage Infrastructure as Code at Scale Using Plural
---
The goal of Plural Stacks is to provide a scalable framework to manage infrastructure as code with a Kubernetes-friendly, API-driven approach. Stacks support Terraform, Terragrunt, Pulumi, Ansible, and custom runner workflows. The core workflow is as follows:

* Declaratively define a stack with a type (terraform, ansible, etc), a location in a git repository to source code from, and a cluster on which it will execute
* On each commit to the tracked git repository, a run is created which the Plural deployment operator will detect and execute on the targeted cluster
   - this allows users to fine grain permissions and network location of IaC runs where both are necessary to configure.
* Plural will carefully execute the run for you, and besides basic information like communicating stdout to the UI, we will also gather and present useful information like inputs/outputs, terraform state diagrams and more
* On PRs to the tracked repository, a "plan" run is also executed and comments posted on the relevant PR where possible.

To get a better idea of the full power of the experience, feel free to take a look at this demo video (at 2x speed if you want to save some time):

{% embed url="https://youtu.be/06WXbvw6p3w" aspectRatio="16 / 9" /%}

# Supported stack types

| Type | Use it for |
| --- | --- |
| `TERRAFORM` | Terraform configurations |
| `TERRAGRUNT` | Terraform configurations orchestrated with Terragrunt |
| `PULUMI` | Pulumi programs in supported runtimes |
| `ANSIBLE` | Ansible playbooks |
| `CUSTOM` | A custom runner image and command workflow |

Pulumi stacks use Pulumi's own state backends. See [Pulumi stacks](/plural-features/stacks-iac-management/pulumi) for Pulumi Cloud and self-managed backend authentication. To drive Console resources from Pulumi via the Terraform provider, see [Using from Pulumi](/api-reference/terraform/pulumi).

# A Basic Stack

The most common way to instantiate a stack is via Kubernetes CRD. This gives a flexible, modular way to recreate infrastructure and pairs nicely with our PR Automation tooling for full self-service around IaC.

Here's an example:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: InfrastructureStack
metadata:
  name: gke-demo
  namespace: stacks
spec:
  name: gke-demo
  type: TERRAFORM
  approval: true
  detach: false
  manageState: true
  actor: console@plural.sh
  configuration:
    version: 1.8.2
  repositoryRef:
    name: fleet
    namespace: fleets
  clusterRef:
    name: mgmt
    namespace: infra
  workdir: gke-cluster
  git:
    ref: main
    folder: terraform
  files:
  - mountPath: /plural
    secretRef:
      name: gcp-creds
  environment:
  - name: GOOGLE_APPLICATION_CREDENTIALS
    value: /plural/creds.json
  - name: TF_VAR_cluster
    value: gke-demo
  - name: TF_VAR_tier
    value: dev
  - name: TF_VAR_fleet
    value: gke-dem
```

The meaning of this yaml is pretty self-documenting, we are:

* creating a `TERRAFORM` stack, so it will execute the standard terraform workflow
* we're using Plural as the state store, removing the need to configure S3 or other backends manually
* `approval` will be required before `terraform apply` will trigger, ensuring a human verifies the plan first to reduce misconfiguration risk
* we're sourcing manifests from the `fleet` repository (referencing a `GitRepository` crd)
* we're executing on the `mgmt` cluster (referencing a `Cluster` crd)
* and we're executing in the `terraform/gke-cluster` folder

You can also see you can bind files and environment variables into the environment, although it is still best practice to use IRSA, GKE workload identity or similar mechanisms for issuing cloud credentials.
