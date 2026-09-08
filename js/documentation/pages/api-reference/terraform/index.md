---
title: Plural Terraform Provider
description: >-
  How to use our terraform provider and other helpful doclinks
---

# Terraform Provider

For ingesting clusters or creating net new infrastructure, our terraform provider is usually the most natural surface for integrating Plural with your existing processes or adopting a full IaC based infrastructure management approach from the ground up.

Our provider is available on the Terraform Registry's [Plural Provider page](https://registry.terraform.io/providers/pluralsh/plural/latest/docs). It can also be used from Pulumi — see [Using from Pulumi](/api-reference/terraform/pulumi).

You can see snippets throughout our getting started guides, but some common usecases are as follows:

## Configuring the Provider

```terraform
terraform {
  required_providers {
    plural = {
      source = "pluralsh/plural"
      version = "0.2.32"
    }
  }
}

provider "plural" {
  # if you use Plural Stacks, authentication is auto-configured using temporary credentials
}
```

## Ingesting a new Cluster

Used for ingesting new or existing kubernetes clusters into Plural.

```terraform
# ensure kubernetes auth is configured for the plural provider
provider "plural" {
    kubernetes = {
        # kubernetes auth configuration
    }
}

resource "plural_cluster" "example" {
  name   = "my-cluster"
  handle = "my-cluster"
  metadata = jsonencode({
    iam = {
        load_balancer = module.addons.gitops_metadata.aws_load_balancer_controller_iam_role_arn # demonstrative module references for setting up IAM
        cluster_autoscaler = module.addons.gitops_metadata.cluster_autoscaler_iam_role_arn
    }
  })
}
```

## Call a pr automation

This is useful if your terraform needs to trigger other changes.  Some usecases:

1. Provision infrastructure in another repo using context from terraform derived in the current repo
2. Self-service provision dev workspaces (create repo with github terraform provider, pr automate github actions, docs, etc).

```terraform
data "plural_pr_automation" "this" {
    name = "my-pr-automation"
}

resource "plural_pr_automation_trigger" "new" {
    pr_automation_id = data.plural_pr_automation.this.id
    pr_automation_branc = "plrl/my-pr-automation/this"
    context = {
        input = "some-input-value"
    }
}
```

## Create/Use a ServiceContext

Service contexts are reusable pieces of configuration which can provide a mechanism to share terraform code between isolated stacks without relying upon a giant state file or brittle cli-based control mechanism.  

They're simple to use, to write to one, here's an example:

```terraform
# example IRSA binding
module "assumable_role_externaldns" {
  source                        = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"
  version                       = "3.14.0"
  create_role                   = true
  role_name                     = "${var.cluster_name}-externaldns"
  provider_url                  = replace(local.cluster_oidc_issuer_url, "https://", "")
  role_policy_arns              = [aws_iam_policy.externaldns.arn] # defined elsewhere
  oidc_fully_qualified_subjects = ["system:serviceaccount:${var.namespace}:${var.externaldns_serviceaccount}"]
}

resource "plural_service_context" "externaldns" {
    name = "plrl/irsa/externaldns"
    configuration = jsonencode({
        roleArn = module.assumeable_role_externaldns.this_iam_role_arn
    })
}
```

And to read, you canjust do:

```terraform
data "plural_service_context "externaldns" {
  name = "plrl/irsa/externaldns"
}

local {
  externaldns_context = jsondecode(data.plural_service_context.externaldns.configuration) # it is json encoded coming from our api
  external_dns_arn = local.externaldns_context.roleArn 
}
```
