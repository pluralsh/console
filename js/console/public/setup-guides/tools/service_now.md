# ServiceNow tool setup

The tool reads and writes tickets through the ServiceNow Table API. It only
touches four tables: `incident`, `change_request`, `problem` and `sc_task`.

## 1) Create an integration user

1. In ServiceNow, open **User Administration → Users** and create a user for
   the workbench, for example `plural.agent`.
2. Check **Web service access only** so the account cannot sign in to the UI.
3. Set a password.
4. Grant the `itil` role, or a custom role with read and write access to the
   four ticket tables.

To let the agent read comments and work notes, the user also needs read
access to `sys_journal_field`. Base instances usually restrict that table, so
you may need an ACL for it.

## 2) Optional: use OAuth instead of a password

ServiceNow can issue tokens with the client credentials grant:

1. Enable the system property
   `glide.oauth.inbound.client.credential.grant_type.enabled`.
2. Open **System OAuth → Application Registry** and create an
   **OAuth API endpoint for external clients**.
3. Set **OAuth Application User** to the integration user.
4. In the Workbench form, turn on OAuth token exchange and use
   `https://<instance>.service-now.com/oauth_token.do` as the token URL, with
   the client ID and secret from the registry entry.

## 3) Fill the Workbench tool form

- **ServiceNow instance URL:** for example `https://example.service-now.com`.
- **Username / Password:** the integration user, when not using OAuth.
- **Allow agents to permanently delete tickets:** off by default. When off,
  the agent has no delete operation. Turn it on only if the integration user
  is allowed to delete records and you want agents to do so.

## Limitations

- Only `incident`, `change_request`, `problem` and `sc_task` are supported.
- The agent can set any field the integration user can write, so give it the
  narrowest role that works.
- Paging is offset based and a full page always returns a next cursor, so the
  last page of an exact multiple is empty.
- State values can be customized per instance. Have the agent read raw values
  before updating `state`.

## 4) Check access

Ask a workbench to list open incidents. A 401 means the credentials are wrong;
a 403 or an empty list usually means the user's roles or ACLs do not cover the
table.
