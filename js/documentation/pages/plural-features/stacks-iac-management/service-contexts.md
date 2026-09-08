---
title: Terraform interop with service contexts
description: Communicate data between terraform and kubernetes using Service Contexts
---

# Overview

A common and incredibly frustrating challenge with managing kubernetes, especially at scale, is sharing state between terraform and the common tools used to manage Kubernetes configuration like helm and kustomize, or with other independent sections of terraform code. 

We've created an API called Service Contexts to facilitate this. At its core, it is simply named bundles of configuration that can be created via api (thus easily integrated with Terraform or Pulumi) and mounted to Plural services, or imported as data resources in other stacks. This will guide you through how to leverage the api throughout your IAC Usage.

## Defining a service context

Here's a simple example, involving setting up an IRSA role for external-dns:

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
        roleArn = module.assumeable_role_externaldns.this_iam_role_arn
    }
}
```

## Using in another Plural Terraform stack

Refering a service context in another stack is simple:

```tf
data "plural_service_context "externaldns" {
  name = "externaldns"
}

local {
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
The `.liquid` extension on `external-dns.yaml.liquid` tells the deployment agent to attempt to template the values file, otherwise it will interpret it as plain yaml.
{% /callout %}

Then in `helm/external-dns.yaml.liquid` you could easily template in the role arn like so:

```yaml
serviceAccount:
  create: true
  annotations:
    eks.amazonaws.com/role-arn: {{ contexts.externaldns.roleArn }}
```

(You can of course layer on any additional externaldns configuration you'd like, we're only interested in the eks iam role attachment here)


Under the hood, on each attempt to retemplate the service, we're pulling the current value of the context alongside the service and injecting it into the passed values file. Ensuring your k8s configuration is always in sync with the desired state in the upstream cloud infrastructure.
