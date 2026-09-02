# GitHub Webhook Setup for Plural

Reference: [GitHub - Creating webhooks](https://docs.github.com/en/developers/webhooks-and-events/webhooks/creating-webhooks)

## 1. Create the webhook in Plural first

In Plural:

1. Set **Type** to `Ticketing`.
2. Set **Provider** to `GITHUB`.
3. Enter a webhook **Name**.
4. Enter a **Signing secret**.
5. Click **Create new webhook**.

Plural generates the webhook URL only after creation. Copy that URL.

## 2. Create webhook in your GitHub instance

Open your GitHub host (for example `https://<your-github-host>/`) and go to repository or organization settings:

1. **Settings** -> **Webhooks** -> **Add webhook**
2. **Payload URL**: paste the Plural URL
3. **Content type**: `application/json`
4. **Secret**: use the same signing secret from Plural
5. Keep webhook **Active**, then save

## 3. Select events

Enable only events Plural should process, usually:

- Issues (opened/edited/closed/reopened)
- Issue comments
- Labels

Avoid "Send me everything" in production.

## 4. Validate

Use GitHub's ping delivery and create a test issue. Confirm in Plural that:

- the request is accepted
- signature verification succeeds
- issue events appear in webhook activity
