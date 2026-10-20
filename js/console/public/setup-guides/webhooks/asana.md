# Asana Webhook Setup for Plural

Reference: [Asana Developers - Webhooks guide](https://developers.asana.com/docs/webhooks-guide)

You can deliver tasks to Plural in two ways:

- **Relay (recommended):** your own integration receives Asana's webhooks, fetches each task, and forwards the full task signed with the Plural secret. Triggers can then match on the task's name and notes.
- **Direct:** point an Asana webhook at the Plural URL. Plural answers Asana's handshake and verifies Asana's signatures, but Asana's events carry only the task ID, so every task is recorded as `Asana Task <gid>` with the body `{webhook event}`.

## 1. Create the webhook in Plural first

In Plural:

1. Set **Type of webhook** to `Ticketing`.
2. Set **Provider type** to `Asana`.
3. Enter a webhook **Name**.
4. Generate or enter a **Secret**.
5. Click **Create**.

Plural shows the webhook URL and secret after create.

## 2a. Relay: forward full tasks

Create the Asana webhook through the Asana API with:

- `resource`: the Asana project to watch
- `target`: your integration's HTTPS URL

Your integration answers Asana's handshake (echo `X-Hook-Secret` in a `200`/`204` response), verifies Asana's `X-Hook-Signature` on later events, and acknowledges heartbeats with `200`.

For each task event, fetch the task from the Asana API and post it to the Plural webhook URL:

```json
{
  "task": {
    "gid": "1209876543210",
    "name": "Checkout is down",
    "notes": "500s from the payments service",
    "permalink_url": "https://app.asana.com/0/1201234567890/1209876543210",
    "completed": false
  }
}
```

`gid`, `name`, and `permalink_url` are required. Send `Content-Type: application/json` and an `X-Hook-Signature` header containing the lowercase hex HMAC-SHA256 of the exact request body, keyed with the **Plural** secret.

## 2b. Direct: point Asana at Plural

Create the Asana webhook with the Plural webhook URL as the `target`:

```bash
curl -X POST https://app.asana.com/api/1.0/webhooks \
  -H "Authorization: Bearer $ASANA_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"data": {"resource": "<project gid>", "target": "<Plural webhook URL>", "filters": [{"resource_type": "task"}]}}'
```

Plural stores the `X-Hook-Secret` from Asana's handshake, echoes it back, and verifies later deliveries with it. Only the first handshake is accepted. To connect a different Asana webhook, rotate the secret in Plural first; that clears the stored handshake secret. Keep the webhook URL private until the handshake completes.

Because direct deliveries use placeholder titles, a trigger has to match `Asana Task` to start jobs from them, so it matches every task in the project.

## 3. Validate

Send a test task whose name or notes match a workbench trigger, then confirm in Plural:

- request accepted (`{"ignored": false, "message": "persisted issue"}`, not `403`)
- for relayed tasks, the name, notes, and link appear on the issue, and completing the task marks the issue completed
- for direct delivery, a `403` on the handshake means a handshake secret is already stored; rotate the Plural secret and create the Asana webhook again
