# Azure DevOps issue webhook setup for Plural

References:

- [Webhooks with Azure DevOps](https://learn.microsoft.com/en-us/azure/devops/service-hooks/services/webhooks?view=azure-devops) (creating a **Web Hooks** subscription, HTTPS and Basic authentication)
- [Service hooks events](https://learn.microsoft.com/en-us/azure/devops/service-hooks/events?view=azure-devops) (work item event types and payload shape)
- [Create a service hook subscription programmatically](https://learn.microsoft.com/en-us/azure/devops/service-hooks/create-subscription?view=azure-devops) (optional REST API flow)

Azure DevOps delivers work item notifications as JSON service hook envelopes (`eventType`, `resource`, and related metadata). Plural accepts **work item** events whose `eventType` begins with `workitem.` (for example `workitem.created`, `workitem.updated`).

## 1. Create the webhook in Plural first

In Plural:

1. Set **Type** to `Ticketing`.
2. Set **Provider** to `AZURE_DEVOPS`.
3. Enter a webhook **Name**.
4. Enter a **Secret**. This must be a strong value you also configure in Azure DevOps: Plural verifies each request using **HTTP Basic authentication**, where the **password** must match this secret (the username is ignored).
5. Click **Create new webhook**.

Plural generates the webhook **URL** only after the webhook is created. Copy that URL from the confirmation screen; you will paste it into Azure DevOps in the next step.

## 2. Create the service hook subscription in Azure DevOps

In your Azure DevOps organization, open the target **project**, then go to **Project settings** → **Service hooks** → **Create subscription** (or **+**).

1. Under **Services**, choose **Web Hooks**, then **Next**.
2. On **Trigger**, pick a **Work item** event (for example **Work item updated**). You can add more subscriptions for other work item events if needed. See Microsoft’s **Service hooks events** documentation for the full list.
3. On **Action**:
   - Set **URL** to the Plural webhook URL from step 1.
   - Use **HTTPS** only (required for Basic authentication on webhooks per Microsoft’s documentation).
   - Enable **HTTP Basic authentication** and set the **password** to the **same secret** you entered in Plural. You may use any **username** (Plural only checks the password).
4. Under **Resource details to send** (or equivalent), prefer **All** so the payload includes work item **fields** (title, description, state, and so on). **Minimal** or **None** may omit fields Plural uses to build the issue body and metadata.
5. Use **Test** to confirm delivery, then **Finish**.

Webhooks cannot target `localhost` or certain reserved IP ranges; the endpoint must be reachable from Azure DevOps over the public internet (or your network must allow Azure DevOps [inbound IP ranges](https://learn.microsoft.com/en-us/azure/devops/organizations/security/allow-list-ip-url?view=azure-devops) if you use restrictions).

## 3. Permissions

Creating service hooks in a project typically requires sufficient project or collection permissions (for example **Project Collection Administrators** for organization-wide configuration, depending on your organization’s policies). See Microsoft’s webhook documentation for current permission requirements.

## 4. Validate

Create or update a work item that matches your subscription scope, then confirm in Plural:

- The HTTP request returns success (not `403` from Basic auth mismatch).
- Issue rows or webhook activity show the expected title, URL, and body content.

If deliveries fail authentication, re-check that the Basic auth **password** in Azure DevOps exactly matches the **Secret** stored on the Plural issue webhook.
