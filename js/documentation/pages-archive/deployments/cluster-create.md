---
title: Create Workload Clusters
description: Spawn New Clusters with Cluster API
---

## Overview

Plural supports both a Bring-Your-Own-Kubernetes model of cluster creation, and the ability to do full provisioning and lifecycle management of Kubernetes with Cluster API. If you'd rather define your clusters yourself using tools like terraform or Pulumi, feel free to check out the docs [here](deployments/import-cluster).

There are two tiers of cluster within Plural:

- Management Cluster - where the Plural control plane resides and also where CAPI controllers will reside. You are free to use this to host other services if you like, but security/reliability best-practices would suggest you at least segregate it from production systems
- Workload Cluster - where main production/staging services are hosted

Seperating workloads at the kubernetes cluster level has the benefit of minimizing the risk of bad kubernetes upgrades and allowing seperate teams/organizations to manage their resources without compromising others. That said if you don't have a strong handle on managing kubernetes at-scale, the operational overhead at the kubernetes level will make that model costly. Hopefully we can help minimize that.

## Create In-Browser

You can create a new cluster entirely in-browser by first clicking the `Create Cluster` button and filling out the form we provider, it should look something like:

![](/assets/deployments/create-cluster.png)

Clusters have both names and unique, human readable handles, the name is not guaranteed unique, since cloud providers don't enforce that across project/account/subscriptions. The handle is optional and will default to the name unless otherwise provided.

Generally there will be some basic cloud-specific cluster metadata, and then you can also configure the general structure of your node topology as well, the main concerns there being:

- node type
- min/max size
- whether to use spot nodes
- labels/taints to use for workload targeting criteria

## Configure Deletion Protection

If you click on a cluster and go to its properties page, you should be able to add delete protection to a cluster, which must be manually disabled before any cluster delete calls can succeed

## Create Using Terraform

```tf
resource "plural_provider" "aws_provider" {
  name = "aws"
  cloud = "aws"
  cloud_settings = {
    aws = {
      # access_key_id = "" # Required, can be sourced from PLURAL_AWS_ACCESS_KEY_ID
      # secret_access_key = "" # Required, can be sourced from PLURAL_AWS_SECRET_ACCESS_KEY
    }
  }
}

data "plural_provider" "aws_provider" {
  cloud = "aws"
}

resource "plural_cluster" "aws_cluster" {
  name = "aws-cluster-tf"
  handle = "awstf"
  version = "1.24"
  provider_id = data.plural_provider.aws_provider.id
  cloud = "aws"
  protect = "false"
  cloud_settings = {
    aws = {
      region = "us-east-1"
    }
  }
  node_pools = {
    pool1 = {
      name = "pool1"
      min_size = 1
      max_size = 5
      instance_type = "t5.large"
    },
    pool2 = {
      name = "pool2"
      min_size = 1
      max_size = 5
      instance_type = "t5.large"
      labels = {
        "key1" = "value1"
        "key2" = "value2"
      },
      taints = [
        {
          key = "test"
          value = "test"
          effect = "NoSchedule"
        }
      ]
    },
    pool3 = {
      name = "pool3"
      min_size = 1
      max_size = 5
      instance_type = "t5.large"
      cloud_settings = {
        aws = {
          launch_template_id = "test"
        }
      }
    }
  }
  tags = {
    "managed-by" = "terraform-provider-plural"
  }
}
```
