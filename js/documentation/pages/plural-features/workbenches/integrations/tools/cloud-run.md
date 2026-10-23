---
title: Cloud Run
description: Invoke a Google Cloud Run service from a workbench
---

Use the Cloud Run integration to let a workbench call one of your Google Cloud Run services as an action. You describe what the service does and the input it accepts, and the workbench agent decides when to call it, builds the input, and reads the service's response. Typical uses include running a runbook step, querying an internal system, or triggering automation you already host on Cloud Run.

The Cloud Run tool reuses a Plural **cloud connection** for GCP credentials. This guide uses the Plural Console UI. For the complete list of integrations and general tool behavior, see [Workbench tools](/plural-features/workbenches/integrations/tools).

## Prerequisites

Before you begin, make sure you have:

* A deployed Cloud Run service that accepts an HTTP `POST` with a JSON body.
* A GCP cloud connection whose service account can invoke the service. See [Grant invoke access](#grant-invoke-access).
* Permission in Plural Console to create a configured tool and edit the target workbench.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

### Grant invoke access

The Cloud Run tool authenticates as the service account in the GCP cloud connection, using a Google-signed ID token. Grant that service account:

* **Cloud Run Invoker** (`roles/run.invoker`) on the service, which allows `run.routes.invoke`. Viewer roles commonly used for cloud queries do not include it.
* `run.services.get`, included in `roles/run.viewer` and `roles/viewer`, if you identify the service by resource name rather than URL.

For example, with the gcloud CLI:

```bash
gcloud run services add-iam-policy-binding restart-service \
  --region=us-central1 \
  --member="serviceAccount:plural-cloud-query@my-project.iam.gserviceaccount.com" \
  --role="roles/run.invoker"
```

If no suitable connection exists, an admin can create one under **Settings → Cloud Connections**. See [Create a cloud connection](/plural-features/workbenches/integrations/tools/cloud#create-a-cloud-connection). Create the connection before you start the Cloud Run tool form, because the form's create link returns you to the Cloud tool form instead.

## Capabilities

The tool adds one operation, **cloud_run_function_call**, to the workbench. The agent sees the description you write and an input schema built from the JSON Schema you provide, and passes two arguments:

* **input** — a JSON object that must validate against your input schema. Plural sends it as the JSON request body.
* **explanation** — why the agent is making the call, what it will do, and what it affects. This is shown with the call, including on approval requests.

Plural sends a `POST` request with `Content-Type: application/json` to the service URL and waits for the response. The tool output contains:

* **result** — the response body, as text.
* **error** — `gcp invoke failed: status=<code>` when the service responds with an HTTP status of 400 or higher. Empty on success.

Because the service can change your systems, you can require a human to approve every call. See [Approvals](#approvals).

## Create the Cloud Run tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **GCP Cloud Run** card and click **Add tool**.

### Configure the service

On the **Configuration** step, enter:

* **Name** — a recognizable name for the tool, such as `restart_service`. The name must start with a lowercase letter, end with a letter or number, and contain only lowercase letters, numbers, dots, and underscores.
* **GCP connection** — the cloud connection that holds the service account key.
* **Service identifier** — the service, in one of these forms:
  * A resource name, `projects/{project}/locations/{region}/services/{service}`. Plural looks up the service URL through the Cloud Run Admin API.
  * The service URL, such as `https://restart-service-abc123-uc.a.run.app`, optionally with a path. It must use `https`, end in `.run.app`, and have no custom port, credentials, or fragment.
* **Description** — what the service does and when the agent should use it. The agent relies on this text to decide when to call the service, so be specific about its purpose and side effects.
* **Input schema (JSON)** — a JSON Schema for the request body. The top-level type must be `object`.

For example, an input schema for a service-restart endpoint:

```json
{
  "type": "object",
  "properties": {
    "cluster": { "type": "string", "description": "Target cluster name" },
    "service": { "type": "string", "description": "Kubernetes deployment to restart" }
  },
  "required": ["cluster", "service"]
}
```

Click **Next**.

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Next**.

### Approvals

On the **Approvals** step, turn on **Requires approval** to pause before every call until someone signs off. It is off by default. Leave it on for any service that changes state.

Click **Save**. After the creation confirmation appears, the tool is available under **Workbenches → Configured Tools**.

## Attach Cloud Run to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the Cloud Run tool by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the Cloud Run tool.
4. Click **Save**.

The configured Cloud Run tool now appears in the workbench's **Tools** section.

## Call the service from a workbench

Open the workbench's **Launch** tab and describe the task. The agent calls the service when the task matches your description, or when you ask for it by name.

Try prompts such as:

* `Investigate the elevated error rate on checkout in prod-east, and if a restart is warranted, use restart_service to restart it.`
* `Call restart_service for the payments deployment on the staging cluster and report the result.`

Submit the job and watch its activity stream. Each call appears as a function activity that shows the input, the agent's explanation, and the output. To verify the integration, confirm that the call's output contains the expected **result** and an empty **error**. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

### Approve or deny a call

When **Requires approval** is on, the call does not run immediately. Its activity shows the input and explanation with the status **Pending approval**, and **Approve** and **Deny** buttons.

* Click **Approve** to call the service. The output then appears on the same activity.
* Click **Deny** to reject the call. You can add an optional reason, which the agent takes into account as it continues.

## Behavior and limits

* **Request timeout.** Plural waits up to 30 seconds for the service to respond. Return quickly and do long work asynchronously.
* **Request path.** With a resource name, Plural posts to the root of the service URL. With a URL, Plural posts to that exact URL, including any path, such as `https://restart-service-abc123-uc.a.run.app/restart`. The ID token's audience is always the URL's origin.
* **Input validation.** Plural rejects inputs that do not match your schema before calling the service.
* **One service per tool.** Create one tool per service, and give each a distinct description.

## Troubleshooting

### Authentication or permission errors

* `gcp invoke failed: status=401` or `status=403` means the service account cannot invoke the service. Grant it `roles/run.invoker` on the service.
* A permission error before the request is sent, when you use a resource name, means the service account lacks `run.services.get`. Grant `roles/run.viewer`, or use the service URL instead.
* An error while creating credentials or fetching an ID token usually means the connection's service account key is incomplete, disabled, or deleted. Ask an admin to update the connection with the full JSON key.

### The call fails

* An output that starts with `Tool call invocation failed:` means Plural could not complete the call. The rest of the message contains the cause, such as an invalid identifier or a timeout. For a call that ran after approval, the activity fails with `Internal function calling error:` followed by the same cause.
* `gcp identifier must be projects/{project}/locations/{location}/services/{name}` means the **Service identifier** is neither a valid resource name nor a URL.
* Errors such as `gcp cloud run url host must end with .run.app` mean the URL is not a default Cloud Run URL. Custom domains are not supported; use the resource name or the `run.app` URL.
* A `status=5xx` error means the service itself failed. Check the service's logs in Cloud Logging, and the **result** body for details.

### The agent does not call the service

* Make the **Description** more specific about when the service should be used.
* Ask for the service by its tool name in your prompt.
* Confirm that the tool is attached to the workbench, appears under **Workbenches → Configured Tools**, and that your user or group has read access to it.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
* [Cloud](/plural-features/workbenches/integrations/tools/cloud)
* [Running workbench jobs](/plural-features/workbenches/running-jobs)
