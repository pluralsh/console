---
title: Import An Existing Cluster
description: Set Up deployments to an existing, self-managed cluster
---

## Overview

Most users will have created a significant amount of kubernetes infrastructure with tooling like terraform, pulumi or other forms of infrastructure automation. It's also very common for users to prefer sticking with their tried-and-true IaC patterns rather than futzing with cluster api, which we completely appreciate and wish to support fully.

You can easily configure deployments to these clusters by installing our agent with a single command, and Plural will manage that agent from then on without any manual intervention.

## Installation

Make sure your local kubeconfig is pointing to the cluster you want to set up, then simply run:

```sh
plural cd clusters bootstrap --name {name-for-your-cluster}
```

You can also configure a few tags for this cluster at create time with:

```sh
plural cd clusters bootstrap --name {name} --tag {name}={value} --tag {name2}={value2}
```

## Terraform

You can also set up a BYOK cluster via terraform with the following (this would be for an eks cluster already created elsewhere in terraform):

```tf
resource "plural_cluster" "this" {
    handle   = "your-cluster-handle"
    name     = "human-readable-name"
    tags     = var.tags
    protect  = true # or false
    kubeconfig = {
        host                   = data.aws_eks_cluster.cluster.endpoint
        cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority.0.data)
        token                  = data.aws_eks_cluster_auth.cluster.token
    }
}
```

## Networking Considerations

You do need to ensure the cluster you're going to be deploying to has egress access to your controlling cluster
