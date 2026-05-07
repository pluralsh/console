# Bitbucket Data Center Webhook Setup for Plural

References:

- [Manage webhooks (Bitbucket Data Center)](https://confluence.atlassian.com/display/BitbucketServer/Manage+webhooks)
- [Event payload (Bitbucket Data Center)](https://confluence.atlassian.com/display/BitbucketServer/Event+payload)

Plural accepts Bitbucket Data Center pull request and pull request comment webhook payloads.

## 1. Create the webhook in Plural first

In Plural:

1. Set **Type** to `Ticketing`.
2. Set **Provider** to `BITBUCKET_DATACENTER`.
3. Enter a webhook **Name**.
4. Enter a **Secret**. Plural validates incoming requests using **HTTP Basic authentication** where this secret must be the Basic auth password (username is ignored).
5. Click **Create new webhook**.

Plural generates the webhook **URL** after creation. Copy that URL.

## 2. Create webhook in Bitbucket Data Center

In your project or repository webhook settings:

1. Go to **Settings** -> **Webhooks** -> **Create webhook**.
2. Set the target **URL** to the Plural webhook URL from step 1.
3. Enable **Basic authentication** for the webhook.
4. Use any username and set the password to the same secret you entered in Plural.
5. Save the webhook.

## 3. Select events

Enable pull request events Plural can process, typically:

- `pr:opened`
- `pr:modified`
- `pr:merged`
- `pr:declined`
- `pr:comment:added`
- `pr:comment:edited`
- `pr:comment:deleted`

## 4. Validate

Trigger a test PR event and verify in Plural:

- request is accepted (not `403`)
- webhook appears in activity
- pull request and comment data sync into issues correctly
