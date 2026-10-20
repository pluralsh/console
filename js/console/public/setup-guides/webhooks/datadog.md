# Datadog Webhook Setup for Plural

References:
- [Datadog - Webhooks integration](https://docs.datadoghq.com/integrations/webhooks/)
- [Datadog - Webhooks Integration API](https://docs.datadoghq.com/api/latest/webhooks-integration/)

## 1. Create the webhook in Plural first

In Plural:

1. Set **Type of webhook** to `Observability`.
2. Set **Provider type** to `Datadog`.
3. Enter a webhook **Name**.
4. Enter or generate a **Secret**.
5. Click **Create**.

Copy the generated Plural webhook URL.

## 2. Create webhook in Datadog

In Datadog (`https://app.datadoghq.com/` or your Datadog site), open the **Webhooks** integration tile and add a webhook:

1. Set **Name**, for example `plural`
2. Set **URL** to the Plural webhook URL
3. Configure HTTP Basic auth so Plural can verify calls (password = Plural signing secret, any username)
4. Replace the **Payload** with the custom payload below

Plural only accepts HTTP Basic auth. Use one of:

- Credentials in the URL: insert `plrl:<signing-secret>@` after `https://`
- **Custom Headers**: `{"Authorization": "Basic <base64 of plrl:signing-secret>"}`. You can keep the encoded value in a hidden Datadog custom variable.

A header that carries the raw secret is rejected with 403.

### Custom payload

The default Datadog payload has no `status`, so Plural would treat every notification as resolved. Use:

```json
{
  "id": "$ALERT_CYCLE_KEY",
  "title": "$EVENT_TITLE",
  "body": "$TEXT_ONLY_MSG",
  "status": "$ALERT_TYPE",
  "alert_type": "$ALERT_TYPE",
  "priority": "$ALERT_PRIORITY",
  "link": "$LINK",
  "project": "$TAGS[plrl_project]",
  "cluster": "$TAGS[plrl_cluster]"
}
```

- `$ALERT_CYCLE_KEY` stays the same from trigger to recovery, so the recovery resolves the same alert. `$ID` changes on every notification.
- `$ALERT_TYPE` (`error`, `warning`, `success`, `info`) maps to firing or resolved. Do not use `$ALERT_TRANSITION`: its capitalized values are read as resolved.
- `project` and `cluster` associate the alert with a Plural project name and cluster handle. You can instead write `Plural Cluster: <handle>` and `Plural Service: <name>` in the monitor message.

## 3. Trigger from monitors

Reference the webhook from monitor notifications (`@webhook-<name>`). Datadog notifies it on alert, warning, and recovery.

## 4. Validate

Trigger a test monitor alert and recovery, then confirm in Plural:

- request accepted
- auth validated
- the alert fires, then resolves on recovery
