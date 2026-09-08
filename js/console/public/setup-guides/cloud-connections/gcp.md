# GCP cloud connection setup

Use this guide to fill `Project ID` and `Service account key (JSON)`.

## 1) Create a service account

Set `project_id` to the project Cloud Query will access. The following Terraform
creates a dedicated service account and a JSON key for the connection:

```terraform
variable "project_id" {
  type = string
}

provider "google" {
  project = var.project_id
}

resource "google_service_account" "plural_cloud_query" {
  account_id   = "plural-cloud-query"
  display_name = "Plural Cloud Query"
}

resource "google_service_account_key" "plural_cloud_query" {
  service_account_id = google_service_account.plural_cloud_query.name
}
```

## 2) Assign read-only IAM roles

For broad inventory access, bind the predefined `Viewer` role:

```terraform
resource "google_project_iam_member" "plural_cloud_query_viewer" {
  project = var.project_id
  role    = "roles/viewer"
  member  = "serviceAccount:${google_service_account.plural_cloud_query.email}"
}
```

For least privilege, replace `roles/viewer` with service-specific viewer roles that
match the resources you intend to query. For example:

```terraform
resource "google_project_iam_member" "plural_cloud_query_compute_viewer" {
  project = var.project_id
  role    = "roles/compute.viewer"
  member  = "serviceAccount:${google_service_account.plural_cloud_query.email}"
}

resource "google_project_iam_member" "plural_cloud_query_storage_viewer" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.plural_cloud_query.email}"
}
```

Apply bindings in every project Cloud Query must inspect. A separate connection is
needed when you want a different default project or service-account key.

## 3) Export and protect the JSON key

The connection currently requires a service-account key JSON payload:

```terraform
output "plural_cloud_query_service_account_key" {
  value     = base64decode(google_service_account_key.plural_cloud_query.private_key)
  sensitive = true
}
```

Store the output only in a secret manager and do not commit it to source control.
Terraform state also contains this private key, so use encrypted remote state with
strict access controls. Rotate the key by replacing the
`google_service_account_key` resource and updating the connection.

## 4) Fill the cloud connection form

- `Project ID`: `var.project_id`
- `Service account key (JSON)`: paste the decoded
  `plural_cloud_query_service_account_key` output, including the opening and closing
  braces.
