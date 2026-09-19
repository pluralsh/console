# Jira Cloud tool setup

Use a dedicated Atlassian account with only the Jira project permissions the
workbench needs.

## 1) Create an API token

1. Open the Atlassian account security settings.
2. Create an API token for the integration account.
3. Copy the token when it is shown.

## 2) Fill the Workbench tool form

- **Jira Cloud URL:** the site URL, such as `https://example.atlassian.net`.
- **Email:** the integration account's Atlassian email address.
- **API token:** the token created above.

The tool uses Jira REST API v2 with HTTP Basic authentication. The API token is
used in place of a password.

## 3) Limit project permissions

Grant Browse Projects and the issue/comment permissions required for the
configured workflows. Do not grant Jira administration permissions.
