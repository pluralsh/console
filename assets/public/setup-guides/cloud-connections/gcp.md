# GCP cloud connection setup

Use this guide to fill `Project ID` and `Service account key (JSON)`.

## 1) Create a service account

Create a dedicated service account for this integration and generate a JSON key.

Store the key securely and rotate it periodically.

## 2) Assign read-only IAM roles

Recommended approach:
- Assign only read/list roles needed for your target services.
- Prefer service-specific viewer roles (for example `roles/compute.viewer`, `roles/storage.objectViewer`) over broad basic roles.

If you need broad inventory quickly, `roles/viewer` is common, but it is broader than strict least privilege. Narrow it over time with service-specific roles or a custom role.

## 3) Fill the cloud connection form

- `Project ID`: default project context
- `Service account key (JSON)`: full JSON key payload
