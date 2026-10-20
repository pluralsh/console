---
title: Splunk
description: Search logs stored in Splunk Enterprise or Splunk Cloud
---

The Splunk tool gives a workbench read-only access to logs already stored in Splunk Enterprise or Splunk Cloud. It searches that data through the Splunk management REST API and does not ingest logs or install a forwarder. The agent uses SPL (Splunk Processing Language) to query logs and can retrieve individual log events or aggregate log counts over time.

## Prerequisites

Before you begin, make sure you have:

* A Splunk Enterprise search head or Splunk Cloud deployment that is already indexing the logs you want the workbench to query.
* Permission in Plural Console to create a configured tool and edit the target workbench.
* The Splunk management REST API base URL (port 8089, not the Splunk Web port).
* A dedicated Splunk user with appropriate capabilities and index access (see below).
* Authentication credentials: either a JWT authentication token (recommended), a Splunk session key, or username and password.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

{% callout severity="info" %}
Free trial Splunk Cloud stacks cannot use the REST API. Splunk Cloud Platform typically requires allowlisting the workbench egress IPs on port 8089 before the API is accessible.
{% /callout %}

### Find the management REST API base URL

The Splunk integration calls the management port, not the Splunk Web UI. Use **HTTPS** and port **8089** by default. Do not use Splunk Web port 8000 or HTTP Event Collector (HEC) port 8088.

#### Splunk Cloud Platform

1. Log in to Splunk Web.
2. Copy the hostname from the browser address bar (for example `acme.splunkcloud.com`). Ignore everything after the hostname.
3. The management REST API base URL is `https://<hostname>:8089`.

Port 8089 is often closed until you allowlist the caller using the Admin Config Service `search-api` IP allow list, or open a Splunk support case to enable REST API access.

#### Splunk Enterprise

1. Identify the search head hostname or IP you use to run searches (not a heavy forwarder).
2. Confirm the management port: **Settings → Server settings → General settings → Management port** (default 8089).
3. The management REST API base URL is `https://<search-head-host>:8089`.

For local or self-signed TLS certificates, append `?insecure_skip_verify=true` to the URL (for example `https://splunk.internal:8089?insecure_skip_verify=true`).

### Create a Splunk user and role

Create a dedicated role with the minimum capabilities required for the search export API:

* `search` — required to run SPL queries
* `rest_properties_get` — commonly required for REST search clients

Do not grant write or admin capabilities such as `indexes_edit`, `admin_all_objects`, `edit_user`, or `edit_roles`.

On the same role, configure **Indexes** to allow only the indexes this tool should query:

* **Indexes allowed** (`srchIndexesAllowed`) — the indexes the user may search
* **Indexes searched by default** (`srchIndexesDefault`) — optional defaults when a query does not name an index

If these are empty or omit the target index, search calls can succeed with no events returned.

Create a dedicated service user (**Settings → Users and authentication → Users → New User**) and assign only the role above.

### Create authentication credentials

The Splunk integration supports three authentication methods. Choose one:

#### Option A: Bearer authentication token (recommended)

Bearer tokens are JWT authentication tokens created in **Settings → Tokens**. They are not HTTP Event Collector (HEC) tokens.

1. Enable token authentication if it is off: **Settings → Tokens → Token Settings → Enable token authentication**. This requires the `edit_tokens_settings` capability.
2. Go to **Settings → Tokens → New Token**.
3. Set **User** to the dedicated service user created above and **Audience** to a short purpose string such as `plural-workbench`.
4. Create the token and copy it immediately. Splunk will not show the full value again.

In the Console configuration form, paste the token into **Authentication token** and select **Bearer** as **Token type**. Leave **Username** and **Password** empty.

#### Option B: Splunk session key

A Splunk session key is returned by `POST /services/auth/login` and is sent as `Authorization: Splunk <sessionKey>`. Session keys expire according to the Splunk session timeout, so bearer tokens are usually a better choice for a persistent workbench connection.

Create a session key using the dedicated user's username and password:

```shell
curl -sS -k https://<host>:8089/services/auth/login \
  --data-urlencode username=<username> \
  --data-urlencode password=<password>
```

Copy the value inside `<sessionKey>...</sessionKey>`. In the Console configuration form, paste it into **Authentication token** and select **Splunk** as **Token type**. Leave **Username** and **Password** empty.

#### Option C: Username and password

In the Console configuration form, fill **Username** and **Password** with the dedicated service user credentials. Leave **Authentication token** empty. **Token type** is ignored when no token is supplied.

## Capabilities

The Splunk tool supports two read-only operations:

* **Search logs** — run SPL queries to retrieve log events matching search criteria, facets, and time ranges. The tool calls `POST /services/search/v2/jobs/export` with the SPL search, time bounds, and output mode. Results are capped at 500 log events.
* **Aggregate logs** — count log events in time buckets for trend analysis and volume monitoring using SPL `bin` and `stats` commands.

The tool does not create saved searches, write to indexes, or call the HTTP Event Collector (HEC). It requires the `search` and `rest_properties_get` capabilities and read access to the target indexes.

## Create the Splunk tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **Splunk** card and click **Add tool**.

### Configure the connection

On the **Configuration** step, enter:

* **Name** — a recognizable name for the connection, such as `splunk-production`.
* **URL** — the Splunk management REST API base URL, for example `https://splunk.example.com:8089`. Do not include `/services/search/` or any other path.
* **Authentication token** — a JWT bearer token from **Settings → Tokens** or a session key from `/services/auth/login`.
* **Token type** — select **Bearer** for JWT tokens (default) or **Splunk** for session keys. Ignored if **Authentication token** is empty.
* **Username** and **Password** — the dedicated service user credentials. Leave empty if using a token.

Click **Next**.

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. After the creation confirmation appears, the connection is available under **Workbenches → Configured Tools**.

## Attach Splunk to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the Splunk connection by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the Splunk connection.
4. Click **Save**.

The configured Splunk tool now appears in the workbench's **Tools** section.

## Query Splunk from a workbench

Open the workbench's **Launch** tab and describe the investigation in the prompt box. Include the search terms or SPL query, index or sourcetype filters, a time range, and what you want to find. The workbench chooses the appropriate Splunk operation; there is no separate Splunk query builder in Console.

Try prompts such as:

* `Using Splunk, find error events in the app logs index during the last hour and summarize the most common messages.`
* `Search Splunk for events with sourcetype=nginx containing "timeout" in the last 30 minutes. Group by host and show counts.`
* `Using Splunk, aggregate event volume by hour from the prod index over the last 24 hours and identify any spikes.`

You can include SPL syntax directly in prompts when you need precise filtering, for example `index=main sourcetype=access_combined status>=500`.

Submit the job and watch its activity stream. To verify the integration, confirm that the job completes, open its Splunk tool activity, and check that the call succeeded and returned log data. A tool activity entry can also contain an API error, so its presence alone does not verify the connection. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

## Query behavior and limits

The Splunk tool is read-only. It cannot create saved searches, modify indexes, or write events.

Keep these query behaviors in mind:

* The tool calls `POST /services/search/v2/jobs/export` with the SPL search, time bounds, and `output_mode=json`.
* Facets provided by the agent are appended to the first SPL search stage as `field="value"` predicates.
* Searches return a maximum of 500 events. Use explicit time ranges and filters to narrow results. The tool appends `| head 500` when a limit is specified.
* Specify explicit time ranges for predictable results. The default time range covers recent logs when no range is supplied.
* If the search does not specify an index and the role's **Indexes searched by default** is empty, Splunk may search no indexes and return no events even if the search syntax is valid.
* Timestamps are parsed from the `_time` field, with fallback to structured fields in the raw message (such as `time`, `timestamp`, or `@timestamp`) and finally `_indextime`.

## Troubleshooting

### Authentication or permission errors

* Verify that the **URL** is correct, uses port 8089, and is reachable from the Plural workbench environment.
* For Splunk Cloud, confirm that the workbench egress IPs are allowlisted on the `search-api` IP allow list or that port 8089 is otherwise accessible.
* Confirm that the token or username and password belong to a Splunk user with the required capabilities.
* Check that the user's role has the `search` and `rest_properties_get` capabilities.
* Verify that the role's **Indexes allowed** includes the indexes you want to query.
* For bearer tokens, confirm that **Token type** is set to **Bearer** and that the token has not expired. Session keys expire according to the Splunk session timeout.
* To rotate credentials, open **Workbenches → Configured Tools**, select **Edit configuration**, and enter the replacement token or username and password. Existing secret values are never displayed.

### No data is returned

* Verify in Splunk that the expected events exist for the same search and time range.
* Confirm that the search specifies an index or that the role's **Indexes searched by default** is configured.
* Check that the role's **Indexes allowed** includes the target index. An empty or mismatched allow list causes searches to return no events even if the SPL syntax is valid.
* Include an explicit time range and verify index names, sourcetypes, and field names for spelling or case mismatches.
* Confirm that the tool is attached to the workbench by opening the workbench's **Tools** dialog.

### A query fails or returns incomplete results

* Open the failed Splunk activity in the job and inspect the error message before retrying.
* Verify SPL syntax. Start with a simple, known-good search and add filters incrementally.
* Remember that results are capped at 500 events. Use narrower time ranges or more specific filters if the result set is incomplete.
* If the search times out, reduce the time range or add index filters to limit the scope.

### The Splunk tool is unavailable

* Confirm that the tool appears under **Workbenches → Configured Tools**.
* Verify that your user or group has read access to the configured tool.
* Reopen the workbench's **Tools** dialog and confirm that the Splunk connection is selected.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
