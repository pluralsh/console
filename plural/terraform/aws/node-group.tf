data "aws_eks_node_groups" "all" {
  cluster_name = var.cluster_name
}

data "aws_eks_node_group" "nodes" {
    for_each = data.aws_eks_node_groups.all.names
    cluster_name = var.cluster_name
    node_group_name = each.value
}

locals {
    node_groups = [for _, n in data.aws_eks_node_group.nodes : n]
}

module "dedicated_node_group" {
  source = "github.com/pluralsh/module-library//terraform/eks-node-groups/multi-az-node-groups?ref=20e64863ffc5e361045db8e6b81b9d244a55809e"
  cluster_name           = var.cluster_name
  default_iam_role_arn   = try(local.node_groups[0].node_role_arn, var.node_role_arn)
  tags                   = var.tags
  node_groups_defaults   = var.node_groups_defaults

  node_groups            = var.dedicated_node_groups
  set_desired_size       = false
  private_subnet_ids     = distinct(concat(flatten(local.node_groups[*].subnet_ids), var.subnet_ids))
}