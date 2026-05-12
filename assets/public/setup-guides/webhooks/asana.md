# Asana Webhook Setup for Plural

Reference: [Asana Developers - Create a webhook](https://developers.asana.com/reference/createwebhook)

## 1. Create the webhook in Plural first

In Plural:

1. Set **Type** to `Ticketing`.
2. Set **Provider** to `ASANA`.
3. Enter a webhook **Name**.
4. Enter a **Signing secret**.
5. Click **Create new webhook**.

Plural generates the webhook URL after create. Copy it.

## 2. Create webhook subscription in Asana

Asana webhooks are created through the Asana API against your workspace/project resources on `https://app.asana.com/`.

Create the webhook with:

- `resource`: the Asana project/task resource to watch
- `target`: the Plural webhook URL

During creation, Asana sends a handshake with `X-Hook-Secret`. Your endpoint must echo that header in a `200`/`204` response to complete setup.

## 3. Event scope

Scope the webhook resource to incident/ticketing work so Plural receives only relevant task lifecycle updates.

## 4. Secret and verification note

Asana signs events with its own webhook secret (`X-Hook-Secret` flow), which is different from tools that let you set a custom shared token. Keep the Plural signing secret for Plural-side webhook identity, and ensure Asana handshake succeeds.

## 5. Validate

Create or update a test task in the subscribed resource, then confirm in Plural:

- request accepted
- event payload parsed
- expected task lifecycle changes visible
