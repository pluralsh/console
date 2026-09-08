---
title: Global services
description: Replicate services to all or part of your fleet
---

Plural natively supports a concept of global services, e.g. a service that's replicated across a subset of your fleet. This is particular for low level kubernetes system add-ons like ingress controllers, service meshes, cert manager, etc. To define a global service, you first need to define a service that will serve as a source, then use the `GlobalService` CRD:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: GlobalService
metadata:
  name: system-upgrade
  namespace: infra
spec:
  tags:
    fabric: edge
  template:
    namespace: system-upgrade
    helm:
      version: '0.1.1'
      chart: system-upgrade-controller
      repository:
        namespace: infra
        name: console
```

In this specific case, we set up the k3s system upgrade controller on a single cluster, then replicate it using the `GlobalService` CR to all clusters with the `edge: fabric` tags. You can also target on kubernetes distribution (eg EKS, AKS, GKE, K3s, etc) or cluster api provider, and we're welcome to other targeting/organization mechanisms as well if those are not sufficient.

## Templating within Global Services

A very common problem you'll face when redeploying apps across your fleet is there's cluster-specific data you'll need for each instance of it. Plural supports that through its templating capabilities in the deployment agent on a cluster.

Take an example of setting up external-dns fleet wide. You'll likely need to configure a different domain and iam arn for each cluster. You can leverage the cluster resources built-in metadata field alongside templating to accomplish that easily, like so:

The ideal way to provide metadata is via terraform, since very often that is the source of truth for the initial values.  This would be done via code like this:

```terraform
resource "plural_cluster" "this" {
  name = "eks-prod"

  metadata = jsonencode({
    externaldnsRoleArn = "arn:..."
    domain = "my.domain.com"
    ...
  })
}
```

That said, you can also do it in yaml using a `Cluster` custom resource, like what's presented below:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: Cluster
metadata:
  name: eks-prod
  namespace: infra
spec:
  handle: eks-prod
  tags:
    fabric: eks # add eks tag
  metadata:
    externaldnsRoleArn: arn:...//externaldns
    domain: my.domain.com # can add any nested map structure as metadata
```

From there, you can define your global service and the helm values needed for it:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: GlobalService
metadata:
  name: system-upgrade
  namespace: infra
spec:
  tags:
    fabric: eks
  template:
    git:
      url: git@github.com:pluralsh/infra-example.git
      ref: main
      folder: helm-values # or wherever else you want to store the helm values
    helm:
      version: 6.31.4
      chart: externaldns
      valuesFiles:
        - externaldns.yaml.liquid # use a liquid extension to enable templating in this file
      repository:
        namespace: infra
        name: externaldns
```

From there, your `helm-values/externaldns.yaml.liquid` might look something like:

```yaml
domainFilters:
  - {{ cluster.metadata.domain }}

serviceAccount:
  enabled: true
  annotations:
    eks.amazonaws.com/role-arn: {{ cluster.metadata.externaldnsRoleArm }}
```

If you added secrets, you can access them with something like `{{ configuration.YOUR_SECRET_NAME }}` and if you want to use service contexts, we recommend checking the docs {% doclink to="terraform-interop" %}here{% /doclink %}.

Very commonly there's actually a lot of overlap between configuration on the same cluster, so the metadata blob will be smaller than you might expect.