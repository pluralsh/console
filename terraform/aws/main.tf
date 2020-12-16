resource "kubernetes_namespace" "watchman" {
  metadata {
    name = var.namespace
  }
}