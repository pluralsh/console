---
title: Terraform interop with service contexts
description: Communicate data between Terraform and Kubernetes using Service Contexts
---

# Overview

A common and incredibly frustrating challenge with managing Kubernetes, especially at scale, is sharing state between Terraform and the common tools used to manage Kubernetes configuration, like Helm and Kustomize, or with other independent sections of Terraform code. 

We've created an API called Service Contexts to facilitate this. At its core, a service context is a named bundle of configuration that can be created via the API (and thus easily integrated with Terraform or Pulumi) and mounted to Plural services, or imported as a data resource in other stacks. This guide walks you through how to use the API throughout your IaC usage.

## Defining a service context

Here's a simple example that sets up an IRSA role for external-dns:

```tf
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
    name = "externaldns"
    configuration = {
        roleArn = module.assumable_role_externaldns.this_iam_role_arn
    }
}
```

## Using in another Plural Terraform stack

Referencing a service context in another stack is simple:

```tf
data "plural_service_context" "externaldns" {
  name = "externaldns"
}

locals {
  # can wire it in wherever, this is just an example
  external_dns_arn = data.plural_service_context.externaldns.configuration.roleArn 
}
```

## Attaching to a Plural ServiceDeployment

You can also attach it to an externaldns service like so:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: external-dns
  namespace: infra
spec:
  namespace: external-dns
  git:
    folder: helm
    ref: main
  repositoryRef:
    kind: GitRepository
    name: infra
    namespace: infra
  contexts:
    - externaldns # binds the externaldns context to this service
  helm:
    version: '6.14.1'
    chart: external-dns
    url: https://charts.bitnami.com/bitnami
    valuesFiles:
      - external-dns.yaml.liquid # we're using a multi-source service sourcing this values file from `helm-values/external-dns.yaml.liquid` in the infra repo above
  clusterRef:
    kind: Cluster
    name: target-cluster
    namespace: infra
```

{% callout severity="info" %}
The `.liquid` extension on `external-dns.yaml.liquid` tells the deployment agent to attempt to template the values file; otherwise, it will interpret it as plain YAML.
{% /callout %}

Then in `helm/external-dns.yaml.liquid` you could template in the role ARN like so:

```yaml
serviceAccount:
  create: true
  annotations:
    eks.amazonaws.com/role-arn: {{ contexts.externaldns.roleArn }}
```

(You can of course layer on any additional external-dns configuration you'd like; we're only interested in the EKS IAM role attachment here.)


Under the hood, on each attempt to retemplate the service, we pull the current value of the context alongside the service and inject it into the passed values file, ensuring your Kubernetes configuration is always in sync with the desired state in the upstream cloud infrastructure.
