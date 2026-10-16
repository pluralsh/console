---
title: ServiceNow
description: Create, read, update, and comment on ServiceNow tickets from a workbench
---

The ServiceNow tool lets a workbench agent work with tickets in your ServiceNow instance through the [Table API](https://www.servicenow.com/docs/bundle/latest-api-reference/page/integrate/inbound-rest/concept/c_TableAPI.html). It covers four ticket tables: incidents (`incident`), change requests (`change_request`), problems (`problem`), and catalog tasks (`sc_task`). Requests for any other table are rejected before they reach ServiceNow. The tool does not limit which columns a query can read, so the integration user's ACLs are what restrict data, including fields reached through references such as `caller_id.email`.

For the complete list of integrations and general tool behavior, see [Workbench tools](/plural-features/workbenches/integrations/tools).

## Prerequisites

* A ServiceNow instance and an admin who can create users and roles.
* Permission in Plural Console to create a configured tool and edit the target workbench.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

### Create an integration user

Use a dedicated service account with the narrowest role that works. The agent can set any field the account can write, including `assigned_to` and `caller_id`, so its permissions are the limit on what a prompt can change.

1. In ServiceNow, open **User Administration → Users** and create a dedicated user, for example `plural.agent`.
2. Check **Web service access only** so the account cannot sign in to the UI.
3. Set a password.
4. Grant the `itil` role, or a custom role with read and write access to the four ticket tables.

Comments and work notes are stored in the `sys_journal_field` table. Base instances usually restrict that table, so add an ACL that lets the integration user read it if you want the agent to read ticket history. The same goes for the state choices in `sys_choice`, which `list_states` and `transition_record` read to resolve state labels such as `In Progress`.

### Optional: OAuth client credentials

Instead of a password, the tool can fetch a bearer token with the OAuth client credentials grant:

1. Set the system property `glide.oauth.inbound.client.credential.grant_type.enabled` to `true`.
2. Open **System OAuth → Application Registry** and create an **OAuth API endpoint for external clients**.
3. Set **OAuth Application User** to the integration user.
4. Copy the client ID and client secret.

## Capabilities

### Tickets

These work on all four tables.

| Operation | What it does |
|---|---|
| `list_records` | Searches one ticket table with a ServiceNow [encoded query](https://www.servicenow.com/docs/bundle/latest-platform-user-interface/page/use/using-lists/concept/c_EncodedQueryStrings.html), with field selection and offset paging. |
| `get_record` | Reads one ticket by `sys_id` or by number, such as `INC0010001`. |
| `create_record` | Creates a ticket with a short description, an optional description, and any other fields. |
| `update_record` | Changes fields on a ticket: assignment, priority, close codes, and so on. |
| `list_comments` | Lists additional comments and work notes on a ticket, newest first. |
| `add_comment` | Adds a work note (internal, the default) or an additional comment (visible to the caller). |
| `list_states` | Lists the states a table can have. For a change request it lists the states that change can move to next. |
| `transition_record` | Moves a ticket to another state. The target is checked against the states from `list_states` when ServiceNow reports them, and a rejection from ServiceNow, such as a missing `close_code` or `close_notes`, is returned to the agent. |

The read-only operations are `list_records`, `get_record`, `list_comments`, and `list_states`. The others change data in ServiceNow and are left out of read-only surfaces such as the workbench MCP server. The tool cannot delete tickets. Agents close or cancel them with `transition_record` instead.

Reads return display values (labels such as `In Progress`) by default. The agent can ask for raw values, or both, when it needs the stored value of a field before updating it. State values differ per table and can be customized per instance. `transition_record` accepts either a value or a label.

Moving a change request uses the [Change Management API](https://www.servicenow.com/docs/r/api-reference/rest-apis/change-management-api.html) to read the states it can move to next and to move the change, which needs the `itil`, `change_manager`, or `sn_change_read` role to read and `itil` or `change_manager` to write.

## Create the tool

1. In Plural Console, go to **Workbenches → Integrations** and create a **ServiceNow** tool.
2. Enter the **ServiceNow instance URL**, for example `https://example.service-now.com`.
3. Enter the integration user's **Username** and **Password**, or turn on OAuth token exchange and enter `https://<instance>.service-now.com/oauth_token.do` as the token URL together with the client ID and secret.
4. Set the access policy and attach the tool to a new or existing workbench.

## Limitations

* **Four tables only.** `incident`, `change_request`, `problem`, and `sc_task`. Other tables, including custom ones, are rejected.
* **Paging uses offsets.** `list_records` and `list_comments` return a `nextCursor` whenever a page is full, so reading an exact multiple of the page size ends with one empty page. Page size is capped at 100.
* **Comment history needs an ACL.** `list_comments` reads `sys_journal_field`, which base instances restrict. Without read access the call returns a 403 or an empty list.
* **Transition checks are best effort.** A change is checked against the states it can move to next, as reported by the Change Management API. For incidents, problems, and catalog tasks ServiceNow has no transition API, so `transition_record` checks the target against the table's state choices, and ServiceNow business rules decide whether the move is allowed. When the integration user cannot read the state choices (`sys_choice`) or the next states cannot be read, the state is sent as given and ServiceNow decides. The error message is passed back to the agent.
* **`list_states` for tables other than changes.** It always returns the state choices of the table. The next states are only available for a change request when a `record_id` is given.
* **Custom states.** State values and labels can differ per instance, and change models can add their own states. `list_states` shows what the instance has.
* **No deletes, attachments, or approvals.** The tool has no operation to delete tickets, read or write attachments, or approve and reject approvals. Because `update_record` and `transition_record` write any field the integration user can write, keep approval fields read-only for that user with ACLs. A normal change that needs approval is meant to be approved in ServiceNow before it can move past authorization.
* **Basic auth or client credentials only.** Authorization code and JWT grants are not supported.

## Using it from a workbench

Example prompts:

* "List open P1 incidents assigned to the Platform group."
* "Open a change request for the database upgrade on prod-east and add the rollout plan as a work note."
* "Assign INC0010001 to plural.agent, move it to In Progress, and add a work note with what you found."
* "Resolve INC0010001 with close notes describing the fix."
* "Which states can CHG0030001 move to next?"

## Troubleshooting

* **401 Unauthorized**: the username, password, or OAuth client details are wrong, or the user is locked out.
* **403 Forbidden or empty results**: the user's roles or ACLs do not cover the table. For `list_comments`, check read access to `sys_journal_field`, and for `list_states` check `sys_choice`.
* **Table is not supported**: the tool only works with `incident`, `change_request`, `problem`, and `sc_task`.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
* [ServiceNow webhook](/plural-features/workbenches/integrations/webhooks/service-now)
