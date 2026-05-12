# Jira Webhook Setup for Plural

References:
- [Atlassian Support - Managing webhooks](https://confluence.atlassian.com/adminjiracloud/managing-webhooks-776636231.html)
- [Atlassian Developer - Jira webhooks](https://developer.atlassian.com/cloud/jira/platform/webhooks/)

## 1. Create the webhook in Plural first

In Plural:

1. Set **Type** to `Ticketing`.
2. Set **Provider** to `JIRA`.
3. Enter a webhook **Name**.
4. Enter a **Signing secret**.
5. Click **Create new webhook**.

Copy the generated Plural webhook URL.

## 2. Create webhook in your Jira site

Open your Jira host (for example `https://<your-jira-host>/`) as a Jira admin:

1. Go to Jira admin webhook management
2. Click **Create a Webhook**
3. Set **Name**
4. Set **URL** to the Plural webhook URL
5. Select issue events and optional JQL filter

Jira admin webhooks do not have a standard shared-secret field like GitHub/GitLab, so use HTTPS and restricted JQL scope for safety.

## 3. Select events

Recommended issue lifecycle events:

- issue created
- issue updated
- issue transitioned
- issue resolved/reopened

## 4. Validate

Create and transition a test issue in Jira, then confirm in Plural:

- event arrives and is parsed
- expected issue metadata is present
- workflow/trigger behavior matches expectations
