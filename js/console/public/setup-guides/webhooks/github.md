# GitHub Webhook Setup for Plural

Reference: [GitHub - Creating webhooks](https://docs.github.com/en/developers/webhooks-and-events/webhooks/creating-webhooks)

## 1. Create the webhook in Plural first

In Plural:

1. Set **Type of webhook** to `Ticketing`.
2. Set **Provider type** to `GitHub`.
3. Enter a webhook **Name**.
4. Enter a **Secret**. Plural verifies each request using `X-Hub-Signature-256` computed from this secret.
5. Click **Create**.

Plural generates the webhook URL only after creation. Copy that URL.

## 2. Create webhook in your GitHub instance

Open your GitHub host (for example `https://<your-github-host>/`) and go to repository or organization settings:

1. **Settings** -> **Webhooks** -> **Add webhook**
2. **Payload URL**: paste the Plural URL
3. **Content type**: `application/json`
4. **Secret**: use the same secret from Plural
5. Keep webhook **Active**, then save

## 3. Select events

Choose **Let me select individual events** and enable only events Plural processes:

- Issues
- Issue comments
- Pull requests
- Pull request review comments

Plural ignores events without an issue or pull request, such as Labels or Push.

Avoid "Send me everything" in production.

## 4. Validate

GitHub's ping delivery returns `{"ignored": true}`, which is expected. Create a test issue or pull request that matches a workbench trigger. Confirm in Plural that:

- the request is accepted
- signature verification succeeds
- issue events appear in webhook activity
