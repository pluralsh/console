variable "cluster_name" {
  type = string
  default = "piazza"
}

variable "namespace" {
  type = string
  default = "watchman"
}

variable "watchman_serviceaccount" {
  type = string
  default = "watchman"
}

variable "role_name" {
  type = string
  default = "watchman"
}