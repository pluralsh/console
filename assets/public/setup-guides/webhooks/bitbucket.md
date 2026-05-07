# Bitbucket Cloud Webhook Setup for Plural

References:

- [Manage webhooks (Bitbucket Cloud)](https://support.atlassian.com/bitbucket-cloud/docs/manage-webhooks)
- [Event payloads (Bitbucket Cloud)](https://support.atlassian.com/bitbucket-cloud/docs/event-payloads)
- [Verify webhook signature (Bitbucket Cloud)](https://support.atlassian.com/bitbucket-cloud/kb/bitbucket-cloud-python-sample-code-to-verify-webhook-signature/)

## 1. Create the webhook in Plural first

In Plural:

1. Set **Type** to `Ticketing`.
2. Set **Provider** to `BITBUCKET`.
3. Enter a webhook **Name**.
4. Enter a **Secret**. Plural verifies each request using `X-Hub-Signature` (`sha256=<digest>`) computed from this secret.
5. Click **Create new webhook**.

Plural generates the webhook **URL** only after creation. Copy that URL.

## 2. Create webhook in Bitbucket Cloud

In your Bitbucket Cloud repository:

1. Go to **Repository settings** -> **Webhooks** -> **Add webhook**.
2. Give the webhook a **Title**.
3. Set **URL** to the Plural webhook URL from step 1.
4. Enable the **Secret** option and paste the exact same secret value used in Plural.
5. Save the webhook.

## 3. Select events

Enable only the events Plural needs, typically:

- `issue:created`
- `issue:updated`
- `issue:comment_created`
- `pullrequest:created`
- `pullrequest:updated`
- `pullrequest:fulfilled`
- `pullrequest:rejected`
- `pullrequest:comment_created`

Avoid selecting all events in production.

## 4. Validate

Use Bitbucket's test delivery (or create a test issue / PR) and confirm in Plural:

- request is accepted (not `403`)
- signature validation succeeds
- issue / PR / comment events appear in webhook activity
