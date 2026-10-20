# Jira Webhook Setup for Plural

References:
- [Atlassian Support - Jira automation actions (Send web request)](https://support.atlassian.com/cloud-automation/docs/jira-automation-actions/)
- [Atlassian Support - Issue data (Jira format) payload](https://support.atlassian.com/cloud-automation/docs/issue-data-jira-format-payload-for-send-web-request-action/)

Plural authenticates Jira requests with an `X-Atlassian-Webhook-Secret` header that must equal the Plural secret. Jira admin webhooks can't send custom headers (their optional secret produces an `X-Hub-Signature`, which Plural does not check), so every admin webhook delivery is rejected with `403`. Use a Jira Automation rule with the **Send web request** action instead.

## 1. Create the webhook in Plural first

In Plural:

1. Set **Type of webhook** to `Ticketing`.
2. Set **Provider type** to `Jira`.
3. Enter a webhook **Name**.
4. Generate or enter a **Secret**.
5. Click **Create**.

Copy the generated Plural webhook URL and secret.

## 2. Create an automation rule in Jira

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

- request accepted (check the rule's **Audit log**; `403` means the header is missing or wrong)
- expected issue metadata is present
- workflow/trigger behavior matches expectations
