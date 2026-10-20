# New Relic Webhook Setup for Plural

References:
- [New Relic - Notification integrations (webhook destinations)](https://docs.newrelic.com/docs/alerts/get-notified/notification-integrations/)
- [New Relic - Workflow variables](https://docs.newrelic.com/docs/alerts/get-notified/custom-variables-alert-event-workflows/)

## 1. Create the webhook in Plural first

In Plural:

1. Set **Type of webhook** to `Observability`.
2. Set **Provider type** to `New Relic`.
3. Enter a webhook **Name**.
4. Enter or generate a **Secret**.
5. Click **Create**.

Copy the generated Plural webhook URL.

## 2. Create webhook destination in New Relic

In your New Relic account (`https://one.newrelic.com/` or your mapped account URL):

1. Go to **Alerts** -> **Destinations**
2. Create a **Webhook** destination
3. Set the **Endpoint URL** to the Plural webhook URL
4. Under **Use authorization**, choose **Basic Authentication**:
   - username: any non-empty value
   - password: Plural secret

Plural only accepts HTTP Basic auth. Bearer tokens and custom headers carrying the secret are rejected with 403.

## 3. Attach destination to workflows

Add a webhook notification to a workflow and notify on at least:

- Activated
- Closed

Use policy/account/tag filters to limit noise.

### Map closed issues to RESOLVED

New Relic sends `state` as `CREATED`, `ACTIVATED`, or `CLOSED`. Plural fires on `ACTIVATED`, resolves on `RESOLVED`, and ignores any other state. In the workflow's webhook payload, replace the `state` line and add the Plural association field:

```
"state": {{#eq state "CLOSED"}}"RESOLVED"{{else}}{{json state}}{{/eq}},
"plural": "plrl_project: <project-name>, plrl_cluster: <cluster-handle>, plrl_service: <service-name>",
```

Plural reads `plrl_project:`, `plrl_cluster:`, and `plrl_service:` from anywhere in the payload. Each value ends at a comma or whitespace, so keep a comma after every value except `plrl_service`. Check the **Preview** to confirm the payload is valid JSON.

## 4. Validate

Send a test notification and trigger an alert. Confirm in Plural:

- request accepted
- auth validated
- the alert fires on activation and resolves when the issue closes
