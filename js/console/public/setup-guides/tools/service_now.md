# ServiceNow tool setup

The tool reads and writes tickets through the ServiceNow Table API. It only
touches four tables: `incident`, `change_request`, `problem` and `sc_task`.
Agents can search, read, create, update, comment on and move tickets between
states. For change requests, the Change Management API is only used to read the
states a change can move to next and to move it. Agents cannot delete tickets.

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

### State choices (`sys_choice`)

The agent reads `sys_choice` to turn state labels such as `In Progress` into
values such as `2` for incidents, problems and catalog tasks. The `itil` role
usually cannot query that table through the API: the request fails with
`Field(s) present in the query do not have permission to be read`. Without
access, `list_states` fails for those tables and `transition_record` accepts
raw state values only. Change requests are not affected.

To allow it:

1. Elevate to `security_admin` and open **System Security → Access Control
   (ACL)**. Filter **Name** by `sys_choice` to see the existing rules.
2. Create three rules with **New**, one for each operation `read`,
   `query_match` and `query_range`. Use type `record` and decision type
   `Allow If`. For **Name**, pick the table `Choice [sys_choice]` in the first
   dropdown and `*` (all fields) in the second. Under **Requires role**, click
   **Insert a new row...** and add the `itil` role or a dedicated role that the
   integration user has.
3. Check it as the integration user:
   `GET /api/now/table/sys_choice?sysparm_query=name=incident^element=state&sysparm_limit=5`
   should return rows. If it still fails, **System Security → Debug Security
   Rules** shows which rule blocks the request.

You can skip this and put the state values in the workbench prompt instead.

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

## Limitations

- Only `incident`, `change_request`, `problem` and `sc_task` are supported.
- The agent can set any field the integration user can write, so give it the
  narrowest role that works.
- Paging is offset based and a full page always returns a next cursor, so the
  last page of an exact multiple is empty.
- State transition checks are best effort. A change is checked against the
  states it can move to next, other tables against the state choices
  (`sys_choice`), and ServiceNow business rules decide the rest. If the user
  cannot read those, the state is sent as given.
- The agent cannot read or decide approvals. Normal changes that need approval
  have to be approved in ServiceNow, and approval fields should be read-only
  for the integration user.
- Moving a change needs the `itil` or `change_manager` role to write, and
  `itil`, `change_manager` or `sn_change_read` to read.
- State values can be customized per instance. `list_states` shows them.

## 4) Check access

Ask a workbench to list open incidents. A 401 means the credentials are wrong;
a 403 or an empty list usually means the user's roles or ACLs do not cover the
table.
