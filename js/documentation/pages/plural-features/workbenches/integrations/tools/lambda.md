---
title: Lambda
description: Invoke an AWS Lambda function from a workbench
---

Use the Lambda integration to let a workbench call one of your AWS Lambda functions as an action. You describe what the function does and the input it accepts, and the workbench agent decides when to call it, builds the input, and reads the function's response. Typical uses include running a runbook step, querying an internal system, or opening a ticket through code you already maintain.

The Lambda tool reuses a Plural **cloud connection** for AWS credentials. This guide uses the Plural Console UI. For the complete list of integrations and general tool behavior, see [Workbench tools](/plural-features/workbenches/integrations/tools).

## Prerequisites

Before you begin, make sure you have:

* A deployed AWS Lambda function and its ARN, such as `arn:aws:lambda:us-east-1:123456789012:function:restart-service`.
* An AWS cloud connection whose **Region** is the function's region and whose identity can invoke the function. See [Grant invoke access](#grant-invoke-access).
* Permission in Plural Console to create a configured tool and edit the target workbench.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

### Grant invoke access

The Lambda tool uses the credentials of the AWS cloud connection: its access keys or Plural's ambient AWS identity, and its **Assume role ARN** when set. That identity needs `lambda:InvokeFunction` on the function. The `ReadOnlyAccess` policy commonly used for cloud queries does not include it.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "lambda:InvokeFunction",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:restart-service*"
    }
  ]
}
```

If no suitable connection exists, an admin can create one under **Settings → Cloud Connections**. See [Create a cloud connection](/plural-features/workbenches/integrations/tools/cloud#create-a-cloud-connection). Create the connection before you start the Lambda tool form, because the form's create link returns you to the Cloud tool form instead.

## Capabilities

The tool adds one operation, **lambda_function_call**, to the workbench. The agent sees the description you write and an input schema built from the JSON Schema you provide, and passes two arguments:

* **input** — a JSON object that must validate against your input schema. Plural sends it as the function's event payload.
* **explanation** — why the agent is making the call, what it will do, and what it affects. This is shown with the call, including on approval requests.

Plural invokes the function synchronously and waits for it to finish. The tool output contains:

* **result** — the function's response payload, as text.
* **error** — the Lambda function error type, such as `Unhandled`, when the function fails. Empty on success.

Because the function can change your systems, you can require a human to approve every call. See [Approvals](#approvals).

## Create the Lambda tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **AWS Lambda** card and click **Add tool**.

### Configure the function

On the **Configuration** step, enter:

* **Name** — a recognizable name for the tool, such as `restart_service`. The name must start with a lowercase letter, end with a letter or number, and contain only lowercase letters, numbers, dots, and underscores.
* **AWS connection** — the cloud connection that holds the AWS credentials.
* **Lambda ARN** — the function's ARN.
* **Description** — what the function does and when the agent should use it. The agent relies on this text to decide when to call the function, so be specific about its purpose and side effects.
* **Input schema (JSON)** — a JSON Schema for the function's input. The top-level type must be `object`.

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

## Attach Lambda to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the Lambda tool by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the Lambda tool.
4. Click **Save**.

The configured Lambda tool now appears in the workbench's **Tools** section.

## Call the function from a workbench

Open the workbench's **Launch** tab and describe the task. The agent calls the function when the task matches your description, or when you ask for it by name.

Try prompts such as:

* `Investigate the elevated error rate on checkout in prod-east, and if a restart is warranted, use restart_service to restart it.`
* `Call restart_service for the payments deployment on the staging cluster and report the result.`

Submit the job and watch its activity stream. Each call appears as a function activity that shows the input, the agent's explanation, and the output. To verify the integration, confirm that the call's output contains the expected **result** and an empty **error**. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

### Approve or deny a call

When **Requires approval** is on, the call does not run immediately. Its activity shows the input and explanation with the status **Pending approval**, and **Approve** and **Deny** buttons.

* Click **Approve** to invoke the function. The output then appears on the same activity.
* Click **Deny** to reject the call. You can add an optional reason, which the agent takes into account as it continues.

## Behavior and limits

* **Synchronous only.** Plural waits for the function to return, up to five minutes. Functions that run longer, or that are meant to run asynchronously, time out from Plural's side.
* **Input validation.** Plural rejects inputs that do not match your schema before calling the function.
* **One function per tool.** Create one tool per function, and give each a distinct description.
* **Region.** The function must be in the connection's **Region**. The call fails if the connection has no region.

## Troubleshooting

### Authentication or permission errors

* `aws region is required` means the cloud connection has no **Region**. Ask an admin to set it to the function's region.
* An `AccessDeniedException` means the connection's identity lacks `lambda:InvokeFunction` on the function, or cannot assume **Assume role ARN**.
* A `ResourceNotFoundException` usually means the ARN is wrong or the function is in a different region or account from the connection.

### The call fails

* An output that starts with `Tool call invocation failed:` means Plural could not complete the call. The rest of the message contains the AWS error. For a call that ran after approval, the activity fails with `Internal function calling error:` followed by the same cause.
* A non-empty **error** field means the function itself raised an error. Check the function's CloudWatch logs and the **result** payload for details.
* An input validation error means the agent's input did not match the schema. Make the schema's property descriptions clearer, or mention the expected values in your prompt.

### The agent does not call the function

* Make the **Description** more specific about when the function should be used.
* Ask for the function by its tool name in your prompt.
* Confirm that the tool is attached to the workbench, appears under **Workbenches → Configured Tools**, and that your user or group has read access to it.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
* [Cloud](/plural-features/workbenches/integrations/tools/cloud)
* [Running workbench jobs](/plural-features/workbenches/running-jobs)
