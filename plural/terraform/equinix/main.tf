resource "kubernetes_namespace" "console" {
  metadata {
    name = var.namespace

    labels = {
      "app.kubernetes.io/managed-by" = "plural"
      "app.plural.sh/name" = "console"
      "platform.plural.sh/sync-target" = "pg"
    }
  }
}
