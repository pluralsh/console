# Asana Webhook Setup for Plural

Reference: [Asana Developers - Webhooks guide](https://developers.asana.com/docs/webhooks-guide)

Plural does not answer Asana's webhook handshake, so you can't point an Asana webhook directly at the Plural URL. Forward tasks to Plural from your own integration (for example, a small relay service) and sign each request with the Plural secret.

## 1. Create the webhook in Plural first

In Plural:

1. Set **Type of webhook** to `Ticketing`.
2. Set **Provider type** to `Asana`.
3. Enter a webhook **Name**.
4. Generate or enter a **Secret**.
5. Click **Create**.

Plural shows the webhook URL and secret after create. Copy both into your integration's configuration.

## 2. Receive Asana events in your integration

Create the Asana webhook through the Asana API with:

- `resource`: the Asana project to watch
- `target`: your integration's HTTPS URL (not the Plural URL)

During creation, Asana sends a handshake with `X-Hook-Secret`. Your integration must echo that header in a `200`/`204` response, store the value to verify Asana's `X-Hook-Signature` on later events, and acknowledge Asana's heartbeats with `200`.

Scope the webhook resource to incident/ticketing work so only relevant tasks are forwarded.

## 3. Forward tasks to Plural

Asana events are compact and carry no task name or notes. For each task event, fetch the task from the Asana API and post it to the Plural webhook URL:

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

`gid`, `name`, and `permalink_url` are required. Send `Content-Type: application/json` and an `X-Hook-Signature` header containing the lowercase hex HMAC-SHA256 of the exact request body, keyed with the **Plural** secret (not Asana's `X-Hook-Secret`).

## 4. Validate

Forward a test task whose name or notes match a workbench trigger, then confirm in Plural:

- request accepted (`{"ignored": false, "message": "persisted issue"}`, not `403`)
- task name, notes, and link appear on the issue
- completing the task marks the issue completed
