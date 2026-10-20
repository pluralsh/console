# Jira Webhook Setup for Plural

References:
- [Atlassian Developer - Jira Cloud webhooks](https://developer.atlassian.com/cloud/jira/platform/webhooks/)
- [Atlassian Support - Jira automation actions (Send web request)](https://support.atlassian.com/cloud-automation/docs/jira-automation-actions/)
- [Atlassian Support - Issue data (Jira format) payload](https://support.atlassian.com/cloud-automation/docs/issue-data-jira-format-payload-for-send-web-request-action/)

Plural accepts two ways of authenticating Jira requests:

- **Admin webhook with a secret**: Jira signs each delivery with the secret in an `X-Hub-Signature` header (`sha256=<hex>`). An admin webhook without a secret is rejected with `403`.
- **Automation rule**: the **Send web request** action sends an `X-Atlassian-Webhook-Secret` header equal to the Plural secret.

If `X-Hub-Signature` is present it must be valid; Plural does not fall back to the secret header.

## 1. Create the webhook in Plural first

In Plural:

1. Set **Type of webhook** to `Ticketing`.
2. Set **Provider type** to `Jira`.
3. Enter a webhook **Name**.
4. Generate or enter a **Secret**.
5. Click **Create**.

Copy the generated Plural webhook URL and secret.

## 2a. Admin webhook (requires Jira admin)

In Jira, open **Settings** -> **System** -> **WebHooks** and click **Create a WebHook**:

- **URL**: the Plural webhook URL
- **Secret**: the Plural secret
- **Events**: **Issue** created and updated (comment and worklog events also carry the issue and are recorded as updates)
- Optional JQL filter, for example `project = OPS AND labels = plural`

## 2b. Automation rule

In the Jira project, open **Project settings** -> **Automation** and create a rule:

1. Trigger: **Work item created** and/or **Work item transitioned**
2. Optional: a **JQL condition** to restrict scope (for example `project = OPS AND labels = plural`)
3. Action: **Send web request**
   - **Web request URL**: the Plural webhook URL
   - **HTTP method**: `POST`
   - **Web request body**: **Work item data (Jira format)**
   - **Headers**: `Content-Type: application/json` and `X-Atlassian-Webhook-Secret: <Plural secret>` (mark the secret **Hidden**)
4. Name the rule and turn it on

Plural reads the top-level `issue` object (`key`, `self`, `fields.summary`, `fields.description`, `fields.status.name`). A custom body must keep that shape.

## 3. Validate

Create and transition a test issue in Jira, then confirm in Plural:

- request accepted (`403` means the secret is missing or wrong; for an automation rule, check the rule's **Audit log**)
- expected issue metadata is present
- workflow/trigger behavior matches expectations
