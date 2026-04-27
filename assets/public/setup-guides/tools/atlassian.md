# Atlassian tool setup

Use this guide to fill either `Email` + `API token` or `Service account (JSON)`.

## 1) Generate Atlassian credentials

For Jira/Confluence Cloud:
1. Create an API token in your Atlassian account security settings.
2. Use the token with the account email for basic auth.

Alternatively, provide a service account credential payload if your environment uses one.

## 2) Apply read-only project permissions

Use a dedicated integration user/group and grant only what is needed, typically:
- Browse/read project content
- View issues

Do not grant create/edit/admin project permissions unless required.

## 3) Fill the Workbench tool form

- Option A: `Email` + `API token`
- Option B: `Service account (JSON)`
