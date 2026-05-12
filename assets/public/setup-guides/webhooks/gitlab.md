# GitLab Webhook Setup for Plural

Reference: [GitLab - Webhooks](https://docs.gitlab.com/user/project/integrations/webhooks/)

## 1. Create the webhook in Plural first

In Plural:

1. Set **Type** to `Ticketing`.
2. Set **Provider** to `GITLAB`.
3. Enter a webhook **Name**.
4. Enter a **Signing secret**.
5. Click **Create new webhook**.

Plural then shows the generated webhook URL. Copy it.

## 2. Create webhook in your GitLab instance

Open your GitLab host (for example `https://<your-gitlab-host>/`) and navigate to:

1. **Project** -> **Settings** -> **Webhooks**
2. **Add new webhook**
3. **URL**: paste the Plural webhook URL
4. **Secret token**: paste the same signing secret from Plural
5. Keep **SSL verification** enabled (unless your security policy says otherwise)

## 3. Select events

Enable at least:

- Issue events
- Note/comment events (if comments matter for workflows)
- Label or state changes used by your routing logic

Use project/group scoping to keep event volume relevant.

## 4. Validate

Send GitLab's test event and then create a real test issue. Confirm in Plural:

- request accepted
- secret validation succeeds
- expected issue activity is recorded
