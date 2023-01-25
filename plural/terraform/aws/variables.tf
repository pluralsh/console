variable "cluster_name" {
  type = string
  default = "piazza"
}

variable "namespace" {
  type = string
  default = "console"
}

variable "console_serviceaccount" {
  type = string
  default = "console"
}

variable "role_name" {
  type = string
  default = "console"
}

variable "node_role_arn" {
  type = string
  default = null
  description = "Manually supply an arn for dedicated console nodes"
}

variable "tags" {
  description = "A map of tags to add to all resources"
  type        = map(string)
  default     = {}
}

variable "subnet_ids" {
  description = "manually provided subnet ids for dedicated console nodes"
  type = list(string)
  default = []
}

variable "node_groups_defaults" {
  description = "map of maps of node groups to create. See \"`node_groups` and `node_groups_defaults` keys\" section in README.md for more details"
  type        = any
  default = {
    desired_capacity = 0
    min_capacity = 0
    max_capacity = 3

    instance_types = ["t3.large", "t3a.large"]
    disk_size = 50
    ami_release_version = "1.22.15-20221222"
    force_update_version = true
    ami_type = "AL2_x86_64"
    k8s_labels = {}
    k8s_taints = []
  }
}

variable "dedicated_node_groups" {
  type = any
  default = {
    dedicated = {
      name = "console-dedicated-nodes"
      capacity_type = "ON_DEMAND"
      min_capacity = 0
      max_capacity = 2
      desired_capacity = 0
      instance_types = ["t3.medium"]
      k8s_labels = {
        "plural.sh/capacityType" = "ON_DEMAND"
        "plural.sh/performanceType" = "SUSTAINED"
        "plural.sh/scalingGroup" = "console-nodes"
        "platform.plural.sh/instance-class" = "console"
      }
      k8s_taints = [
        {
          key = "platform.plural.sh/taint"
          value = "CONSOLE"
          effect = "NO_SCHEDULE"
        }
      ]
    }
  }
  description = "Node groups used for dedicated console builds, should have 0 as default capacity"
}