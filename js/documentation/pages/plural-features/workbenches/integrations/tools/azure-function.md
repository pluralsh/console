---
title: Azure Function
description: Invoke an Azure Function from a workbench
---

Use the Azure Function integration to let a workbench call one of your HTTP-triggered Azure Functions as an action. You describe what the function does and the input it accepts, and the workbench agent decides when to call it, builds the input, and reads the function's response. Typical uses include running a runbook step, querying an internal system, or triggering automation you already host on Azure Functions.

The Azure Function tool reuses a Plural **cloud connection** for Azure credentials. This guide uses the Plural Console UI. For the complete list of integrations and general tool behavior, see [Workbench tools](/plural-features/workbenches/integrations/tools).

## Prerequisites

Before you begin, make sure you have:

* A deployed Azure Function with an HTTP trigger that accepts `POST` requests with a JSON body.
* The function's Azure resource ID. See [Find the function identifier](#find-the-function-identifier).
* An Azure cloud connection for the function's subscription, whose service principal can read the function's keys. See [Grant access](#grant-access).
* Permission in Plural Console to create a configured tool and edit the target workbench.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

### Find the function identifier

The tool identifies the function by its full resource ID:

```text
/subscriptions/{subscription-id}/resourceGroups/{resource-group}/providers/Microsoft.Web/sites/{function-app}/functions/{function-name}
```

The subscription in the ID must match the **Subscription ID** of the cloud connection. You can find the ID in the Azure portal on the function's **Overview** page, or with the Azure CLI:

```bash
az functionapp function show \
  --resource-group my-rg \
  --name my-function-app \
  --function-name restart-service \
  --query id -o tsv
```

### Grant access

Plural uses the connection's service principal to look up the function's invoke URL and an access key through Azure Resource Manager, then calls the function over HTTPS with that key. The `Reader` role commonly used for cloud queries is not enough to read keys. Assign the service principal a custom role on the function app with these actions:

* `Microsoft.Web/sites/functions/read`
* `Microsoft.Web/sites/functions/listsecrets/action`
* `Microsoft.Web/sites/functions/listkeys/action`
* `Microsoft.Web/sites/host/listkeys/action`

Plural tries the function's own key first, then its function keys, then the app's host keys. If it cannot read any key, it calls the function without one, which only succeeds for functions with the `anonymous` authorization level.

If no suitable connection exists, an admin can create one under **Settings → Cloud Connections**. See [Create a cloud connection](/plural-features/workbenches/integrations/tools/cloud#create-a-cloud-connection). Create the connection before you start the Azure Function tool form, because the form's create link returns you to the Cloud tool form instead.

## Capabilities

The tool adds one operation, **azure_function_function_call**, to the workbench. The agent sees the description you write and an input schema built from the JSON Schema you provide, and passes two arguments:

* **input** — a JSON object that must validate against your input schema. Plural sends it as the JSON request body.
* **explanation** — why the agent is making the call, what it will do, and what it affects. This is shown with the call, including on approval requests.

Plural sends a `POST` request with `Content-Type: application/json` to the function's invoke URL and waits for the response. The tool output contains:

* **result** — the response body, as text.
* **error** — `azure invoke failed: status=<code>` when the function responds with an HTTP status of 400 or higher. Empty on success.

Because the function can change your systems, you can require a human to approve every call. See [Approvals](#approvals).

## Create the Azure Function tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **Azure Cloud Function** card and click **Add tool**.

### Configure the function

On the **Configuration** step, enter:

* **Name** — a recognizable name for the tool, such as `restart_service`. The name must start with a lowercase letter, end with a letter or number, and contain only lowercase letters, numbers, dots, and underscores.
* **Azure connection** — the cloud connection for the function's subscription.
* **Function identifier** — the function's resource ID.
* **Description** — what the function does and when the agent should use it. The agent relies on this text to decide when to call the function, so be specific about its purpose and side effects.
* **Input schema (JSON)** — a JSON Schema for the request body. The top-level type must be `object`.

For example, an input schema for a service-restart function:

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

On the **Approvals** step, turn on **Requires approval** to pause before every call until someone signs off. It is off by default. Leave it on for any function that changes state.

Click **Save**. After the creation confirmation appears, the tool is available under **Workbenches → Configured Tools**.

## Attach Azure Function to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the Azure Function tool by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the Azure Function tool.
4. Click **Save**.

The configured Azure Function tool now appears in the workbench's **Tools** section.

## Call the function from a workbench

Open the workbench's **Launch** tab and describe the task. The agent calls the function when the task matches your description, or when you ask for it by name.

Try prompts such as:

* `Investigate the elevated error rate on checkout in prod-east, and if a restart is warranted, use restart_service to restart it.`
* `Call restart_service for the payments deployment on the staging cluster and report the result.`

Submit the job and watch its activity stream. Each call appears as a function activity that shows the input, the agent's explanation, and the output. To verify the integration, confirm that the call's output contains the expected **result** and an empty **error**. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

### Approve or deny a call

When **Requires approval** is on, the call does not run immediately. Its activity shows the input and explanation with the status **Pending approval**, and **Approve** and **Deny** buttons.

* Click **Approve** to call the function. The output then appears on the same activity.
* Click **Deny** to reject the call. You can add an optional reason, which the agent takes into account as it continues.

## Behavior and limits

* **Request timeout.** Plural waits up to 30 seconds for the function to respond. Return quickly and do long work asynchronously.
* **Default host only.** The invoke URL must be an `https` address on `azurewebsites.net`. Functions served only from other hosts cannot be called.
* **Input validation.** Plural rejects inputs that do not match your schema before calling the function.
* **One function per tool.** Create one tool per function, and give each a distinct description.

## Troubleshooting

### Authentication or permission errors

* `identifier subscription_id must match connection subscription_id` means the function is in a different subscription from the connection. Select a connection for the function's subscription.
* `azure invoke failed: status=401` means Plural could not read a key and the function requires one. Grant the service principal the key-listing actions in [Grant access](#grant-access).
* An `AuthorizationFailed` error from Azure Resource Manager means the service principal cannot read the function. Check its role assignment on the function app.
* For Azure sign-in errors, confirm that the connection's client secret has not expired.

### The call fails

* An output that starts with `Tool call invocation failed:` means Plural could not complete the call. The rest of the message contains the cause, such as an invalid identifier or a timeout. For a call that ran after approval, the activity fails with `Internal function calling error:` followed by the same cause.
* `azure identifier must be canonical function resource id` means the **Function identifier** is not a full resource ID in the format shown in [Find the function identifier](#find-the-function-identifier).
* `azure function invocation URL host mismatch` means the function's invoke URL is not on `azurewebsites.net`.
* A `status=5xx` error means the function itself failed. Check the function's logs in Application Insights, and the **result** body for details.

### The agent does not call the function

* Make the **Description** more specific about when the function should be used.
* Ask for the function by its tool name in your prompt.
* Confirm that the tool is attached to the workbench, appears under **Workbenches → Configured Tools**, and that your user or group has read access to it.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
* [Cloud](/plural-features/workbenches/integrations/tools/cloud)
* [Running workbench jobs](/plural-features/workbenches/running-jobs)
