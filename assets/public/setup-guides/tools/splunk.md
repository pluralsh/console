# Set up the Splunk integration

Connect a workbench to logs already stored in Splunk Enterprise or Splunk Cloud. This integration is read-only: it streams search results and does not ingest data or install a Splunk forwarder.

The workbench form needs a **management/REST API base URL** and either an **authentication token** or a **username and password**.

## Find the API base URL

The `URL` field is the Splunk **management port** host, not the Splunk Web URL. The integration appends `/services/search/v2/jobs/export` itself, so do not include that path (or any `/en-US/app/...` path).

Use HTTPS. Default management port is **8089**. Do not use Splunk Web port **8000** or HTTP Event Collector (HEC) port **8088**.

### Splunk Cloud Platform

1. Log in to Splunk Web.
2. Copy the hostname from the browser address bar (for example `acme.splunkcloud.com`). Ignore everything after the hostname.
3. Enter `https://<hostname>:8089` in the form.

Example: if Splunk Web is `https://acme.splunkcloud.com/en-US/app/search/search`, the API base URL is `https://acme.splunkcloud.com:8089`.

Port 8089 is often closed until you allowlist the caller:

- Add the workbench egress IPs with the Admin Config Service `search-api` IP allow list, or
- Open a Splunk support case to enable REST API access on 8089.

Free trial Splunk Cloud stacks cannot use the REST API.

### Splunk Enterprise

1. Identify the search head hostname or IP you use to run searches (not a heavy forwarder).
2. Confirm the management port: **Settings → Server settings → General settings → Management port** (default `8089`).
3. Enter `https://<search-head-host>:8089`.

For local or self-signed TLS certificates, append `?insecure_skip_verify=true` to the URL (for example `https://splunk.internal:8089?insecure_skip_verify=true`).

## Create credentials

Create a dedicated integration identity. Do **not** use an HTTP Event Collector (HEC) token from **Settings → Data Inputs → HTTP Event Collector**. HEC tokens ingest events; they cannot call the search REST API.

### Option A: authentication token (recommended)

These are JWT authentication tokens from **Settings → Tokens**, not HEC tokens.

1. Enable token authentication if it is off: **Settings → Tokens → Token Settings → Enable token authentication**. This requires the `edit_tokens_settings` capability (typically `admin` or `sc_admin`).
2. Create the dedicated user and role described below.
3. Go to **Settings → Tokens → New Token**.
4. Set **User** to that dedicated user and **Audience** to a short purpose string such as `plural-workbench`.
5. Create the token and copy it immediately. Splunk will not show the full value again.
6. Paste it into **Bearer token**. Leave **Username** and **Password** empty.

### Option B: username and password

1. Create the dedicated user described below and set a password.
2. Fill **Username** and **Password**. Leave **Bearer token** empty.

## Grant permissions for the search export API

This integration calls only:

`POST {URL}/services/search/v2/jobs/export`

with form fields `search`, `earliest_time`, `latest_time`, and `output_mode=json`. It does not create saved searches, write indexes, or call HEC.

Create a dedicated role: **Settings → Users and authentication → Roles → New Role** (on older Splunk Web: **Settings → Access controls → Roles**).

### Capabilities

Grant only:

- `search` — required to run SPL on `/services/search/v2/jobs/export`
- `rest_properties_get` — commonly required for REST search clients (covers `/services/properties`; included on Splunk's built-in `user` role)

Do not grant write or admin capabilities such as `indexes_edit`, `admin_all_objects`, `edit_user`, or `edit_roles`.

### Index access (required for data)

Capabilities alone do not return events. On the same role, open **Indexes** and allow only the indexes this tool should query:

- **Indexes** / **Indexes allowed** (`srchIndexesAllowed`) — indexes the user may search
- **Indexes searched by default** (`srchIndexesDefault`) — optional defaults when a query does not name an index

If these are empty or omit the target index, the export call can succeed with no logs.

### Create the user

**Settings → Users and authentication → Users → New User** (or **Settings → Access controls → Users**). Assign only the role above. Create the authentication token for this user, not for a personal admin account.

## Complete the configuration

- **URL:** management/REST API base URL (`https://<host>:8089`, no search path)
- **Bearer token:** authentication token from **Settings → Tokens**, or
- **Username** + **Password:** dedicated service user

After saving, attach the tool to a workbench and run a log query against an index the role can search.
