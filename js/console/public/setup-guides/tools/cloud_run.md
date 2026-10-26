# Cloud Run tool setup

Use this guide to fill `GCP connection`, `Service identifier`, `Description`, and `Input schema (JSON)`.

## 1) Create the GCP cloud connection

Create a GCP cloud connection with the GCP cloud connection setup guide. The connection’s `Service account key (JSON)` is required. The predefined `Viewer` role used for inventory does not include invoke.

This tool does two calls with that service account:

- A resource name is resolved with Cloud Run [`services.get`](https://cloud.google.com/run/docs/reference/rest/v2/projects.locations.services/get), which requires [`run.services.get`](https://cloud.google.com/run/docs/reference/iam/permissions). A `*.run.app` URL skips this call.
- The service is invoked with `POST` and a service-account ID token. That requires [`run.routes.invoke`](https://cloud.google.com/run/docs/reference/iam/permissions). The predefined role [`Cloud Run Service Invoker` (`roles/run.servicesInvoker`)](https://cloud.google.com/run/docs/reference/iam/roles) grants that permission. Grant it on the service to the connection’s service account.

The invoke request times out after 30 seconds.

## 2) Fill the Workbench tool form

- `GCP connection`: the connection from step 1
- `Service identifier`: either `projects/{project}/locations/{location}/services/{name}`, or an `https` URL whose host ends in `.run.app`. The URL must not include a port, user info, or fragment.
- `Description`: what the service does
- `Input schema (JSON)`: JSON schema for the object sent as the JSON body

## 3) Approval

`Requires approval` pauses for sign-off before the service is invoked.
