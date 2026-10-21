# GitLab Webhook Setup for Plural

Reference: [GitLab - Webhooks](https://docs.gitlab.com/user/project/integrations/webhooks/)

## 1. Create the webhook in Plural first

In Plural:

1. Set **Type of webhook** to `Ticketing`.
2. Set **Provider type** to `GitLab`.
3. Enter a webhook **Name**.
4. Enter a **Secret**. GitLab sends it in the `X-Gitlab-Token` header.
5. Click **Create**.

Plural then shows the generated webhook URL. Copy it.

## 2. Create webhook in your GitLab instance

Open your GitLab host (for example `https://<your-gitlab-host>/`) and navigate to:

1. **Project** -> **Settings** -> **Webhooks**
2. **Add new webhook**
3. **URL**: paste the Plural webhook URL
4. **Secret token**: paste the same secret from Plural
5. Keep **SSL verification** enabled (unless your security policy says otherwise)

## 3. Select events

Enable the events Plural processes:

- **Work item events** (called **Issues events** on older GitLab versions) for issues and other work items
- **Merge request events** for merge requests
- **Comments** for merge request comments (Plural ignores comments on issues, commits, and snippets)

Use project/group scoping to keep event volume relevant.

## 4. Validate

Send GitLab's test event and then create a real test issue or merge request that matches a workbench trigger. Confirm in Plural:

- request accepted
- secret validation succeeds
- expected issue activity is recorded
