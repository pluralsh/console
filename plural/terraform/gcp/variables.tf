variable "cluster_name" {
  type = string
  default = "plural"
}

variable "namespace" {
  type = string
  default = "console"
}

variable "node_pool" {
  type = string
  default = "ignore"
  description = <<EOF
The node pool of the cluster you've bootstrapped
EOF
}

variable "project_id" {
  type = string
  description = <<EOF
The ID of the project in which the resources belong.
EOF
}