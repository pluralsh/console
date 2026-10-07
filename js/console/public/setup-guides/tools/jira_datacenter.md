# Jira Data Center tool setup

Use a dedicated Jira account with only the project permissions the workbench
needs.

## 1) Create a personal access token

1. Sign in to Jira Data Center as the integration account.
2. Open the account's personal access token settings.
3. Create and copy a token.

## 2) Fill the Workbench tool form

- **Jira Data Center URL:** the base URL users open in a browser, such as
  `https://jira.example.com`.
- **Personal access token:** the token created above.

The tool sends the token as a Bearer credential and uses the instance's
stable `/rest/api/2` API.

## 3) Limit project permissions

Grant Browse Projects and the issue/comment permissions required for the
configured workflows. Do not grant Jira system administration permissions.
