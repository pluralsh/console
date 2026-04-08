# GitLab Webhook Setup for Plural

Generate markdown documentation for creating a webhook in GitLab against plural. Plural allows a webhook to have a url and secret, you need to explain to the user how to register those, and how to configure the appropriate triggers so plural can receive events from alerts, new tickets, and incident issue updates.

## 1. Create the webhook in Plural

In Plural create:

- Type: Ticketing
- Provider: GITLAB
- URL: incoming webhook URL from Plural
- Secret: shared secret

## 2. Register URL and secret in GitLab

In GitLab project/group settings under Webhooks:

- URL: paste the Plural URL
- Secret token: paste the same secret from Plural
- SSL verification: keep enabled unless your environment requires otherwise

## 3. Configure GitLab triggers

Enable events that correspond to ticket lifecycle:

- Issues events
- Notes/comments events (optional)
- Labels changes (if used for severity)
- Confidential issue updates where applicable

For alert-driven workflows, scope to projects where alert tickets are created.

## 4. Test the integration

Use GitLab Test webhook for Issues events and then open a real test issue.

Check Plural for:

- successful request validation
- processed event payload
- activity logs with expected event type

## 5. Operational tips

- keep separate webhooks for staging and production projects
- apply narrow event filters to reduce noise
