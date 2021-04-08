locals {
  gcp_location_parts = split("-", var.gcp_location)
  gcp_region         = "${local.gcp_location_parts[0]}-${local.gcp_location_parts[1]}"
}

resource "google_service_account" "watchman" {
  account_id = "watchman-admin"
  display_name = "Service account for watchman"
}

resource "google_service_account_key" "watchman" {
  service_account_id = google_service_account.watchman.name
  public_key_type = "TYPE_X509_PEM_FILE"

  depends_on = [
    google_service_account.watchman
  ]
}

resource "google_project_iam_member" "watchman_admin" {
  project = var.gcp_project_id
  role    = "roles/owner"

  member = "serviceAccount:${google_service_account.watchman.email}"

  depends_on = [
    google_service_account.watchman,
  ]
}


resource "google_project_iam_member" "watchman_storage_admin" {
  project = var.gcp_project_id
  role    = "roles/storage.admin"

  member = "serviceAccount:${google_service_account.watchman.email}"

  depends_on = [
    google_service_account.watchman,
  ]
}

resource "kubernetes_namespace" "watchman" {
  metadata {
    name = var.namespace
  }
}

resource "kubernetes_secret" "watchman" {
  metadata {
    name = "watchman-credentials"
    namespace = var.namespace
  }
  data = {
    "gcp.json" = base64decode(google_service_account_key.watchman.private_key)
  }

  depends_on = [
    kubernetes_namespace.watchman
  ]
}