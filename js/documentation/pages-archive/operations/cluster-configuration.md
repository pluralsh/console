---
title: Cluster Configuration
description: DevOps workflows that involve editing your cluster's Terraform files.
---

Plural offers a set of sane defaults to spin up a one-size-fits-all Kubernetes cluster, but there will be cases
where you'll want to edit the default cluster configuration to better fit your organization's needs. This will
involve editing the Terraform that we generate for you, which carries risks if administered incorrectly.

In general, all core cluster configuration is set up in a Terraform stack in the `bootstrap` app directory. You can find the Terraform
code under `bootstrap/terraform` if you want to dive in yourself, but we can help guide you here as well.

## Operations on node groups

### Modifying node types

Modifying node types allows you to optimize the infrastructure backing your applications for cost and/or performance reasons.

{% tabs %}
{% tab title="AWS" %}
On AWS, EKS has some interesting limitations around node groups. Since EBS doesn't support multi-AZ disks, to make node autoscaling work properly for stateful workloads, you need to split node groups across all availability zones deployed in a region. Some non-stateful workloads don't need this complexity, so we also have a set of multi-AZ groups as well. To modify either, simply update the `aws-bootstrap` module's `single_az_node_groups` or `multi_az_node_groups` configuration (in `bootstrap/terraform/main.tf`) with:

```shell {% showHeader=false %}
single_az_node_groups = {
    my_node_group = {
      name = "my-node-group"
      capacity_type = "ON_DEMAND" # or SPOT
      min_capacity = 3
      desired_capacity = 3
      instance_types = ["t3.large", "t3a.large"] # or whatever other types you'd like
      k8s_labels = {
        "plural.sh/capacityType" = "ON_DEMAND"
        "plural.sh/performanceType" = "BURST"
        "plural.sh/scalingGroup" = "small-burst-on-demand"
      } # kubernetes labels are good for targeting workloads
}
```

for multi-AZ groups you can do the following:

```shell {% showHeader=false %}
multi_az_node_groups = {
    my_node_group = {
      name = "my-node-group"
      capacity_type = "SPOT"
      instance_types = ["t3.large", "t3a.large"]
      k8s_labels = {
        "plural.sh/capacityType" = "SPOT"
        "plural.sh/performanceType" = "BURST"
        "plural.sh/scalingGroup" = "small-burst-spot"
      }
      k8s_taints = [{
        key = "plural.sh/capacityType"
        value = "SPOT"
        effect = "NO_SCHEDULE"
      }] # taints prevent a node from being schedulable unless a pod explicitly accepts it, good for preventing spot instances from being accidentally used
    }
}
```

{% /tab %}

{% tab title="GCP" %}
On GCP, update the `gcp-bootstrap` modules configuration (in `bootstrap/terraform/main.tf`) with:

```shell {% showHeader=false %}
node_pools = [
    {
      name               = "small-burst-on-demand"
      machine_type       = "e2-standard-2" # or whatever you'd like
      min_count          = 1
      max_count          = 9
      disk_size_gb       = 50
      disk_type          = "pd-standard"
      image_type         = "COS_CONTAINERD"
      spot               = false
      auto_repair        = true
      auto_upgrade       = true
      preemptible        = false
      initial_node_count = 1
      autoscaling        = true
    }
]
# if you'd like to add lables
node_pools_labels = {
    "small-burst-on-demand" = {
      "plural.sh/capacityType" = "ON_DEMAND"
      "plural.sh/performanceType" = "BURST"
      "plural.sh/scalingGroup" = "small-burst-on-demand"
    }
}
# if you'd also like to add taints
node_pools_taints = {
    small-burst-spot = [
      {
        key    = "plural.sh/capacityType"
        value  = "SPOT"
        effect = "NO_SCHEDULE"
      },
    ],
}
```

{% /tab %}

{% tab title="Azure" %}
Currently Azure has an annoying chicken-egg issue with the requirement that at least one node pool must be created. Terraform manages this poorly by forcing cluster recreation if the default node pool changes. To ensure no instability, we strongly recommend you confirm any node topology changes do not interfere with the default node pool on the AKS cluster.

With Azure, update the `azure-bootstrap` modules configuration in `bootstrap/terraform/main.tf` with:

```shell {% showHeader=false %}
node_groups =  [
    {
      name                = "ssod1"
      priority            = "Regular"
      enable_auto_scaling = true
      availability_zones  = ["1"]
      mode                = "System"
      node_count          = null
      min_count           = 1
      max_count           = 9
      spot_max_price      = null
      eviction_policy     = null
      vm_size             = "Standard_D2as_v5"
      os_disk_type        = "Managed"
      os_disk_size_gb     = 50
      max_pods            = 110

      node_labels = {
        "plural.sh/capacityType" = "ON_DEMAND"
        "plural.sh/performanceType" = "SUSTAINED"
        "plural.sh/scalingGroup" = "small-sustained-on-demand"
      } # or whatever labels you'd prefer
      node_taints = [
        # "someTaintName"
      ]
      tags = {
        "ScalingGroup": "small-sustained-on-demand"
      }
    }
]
```

{% /tab %}
{% /tabs %}

## Adding users/roles [AWS]

Because of the limitations set by AWS' IAM authenticator, you'll need to follow this process to add new users or roles to a cluster
running in AWS.

Add these input to `aws-bootstrap` in `bootstrap/terraform/main.tf`

```shell {% showHeader=false %}
map_users = [
    {
      userarn = "arn:aws:iam::<account-id>:user/yourusername"
      username = "yourusername"
      groups = ["system:masters"] # or whatever k8s group you'd prefer
    }
  ]

# if you'd rather authenticate with an IAM role (a recommended approach), add this block
manual_roles = [
    {
      rolearn = "arn:aws:iam::<account-id>:role/yourrolename"
      username = "yourrolename"
      groups = ["system:masters"]
    }
]
```
