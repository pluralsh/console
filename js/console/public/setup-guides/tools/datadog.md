# Set up the Datadog integration

Connect a workbench to the metrics, logs, and traces already stored in your Datadog account. This integration provides read-only query access; it does not install the Datadog Agent or configure data ingestion.

## Create credentials in Datadog

### API key

1. Open your account menu and select **Organization Settings**.
2. Select **API Keys**, then click **New Key**.
3. Enter a descriptive name, create the key, and copy its value.

### Application key

For a dedicated integration identity:

1. Go to **Organization Settings → Accounts → Service Accounts**.
2. Create a service account and assign it a role with the permissions listed below.
3. Select the service account, click **New Key**, name the key, and click **Create Key**.
4. Copy the application key immediately. Service-account application keys are displayed only once.

Alternatively, create a user-owned key under **Organization Settings → Application Keys → New Key**. The key uses the permissions of its owner and stops working if that user is disabled, so a service account is preferable for a shared integration.

Both keys are required for queries. The API key identifies the organization, while the application key authorizes requests using its owner's permissions.

## Grant read permissions

Grant the application key owner only the permissions needed for the capabilities you plan to enable:

- **Metrics:** `timeseries_query` and `metrics_read`
- **Logs:** `logs_read_data` and `logs_read_index_data`
- **Traces:** `apm_read`

Scope `logs_read_index_data` to every log index the workbench needs to query. See [Datadog permissions](https://docs.datadoghq.com/account_management/rbac/permissions/) for role configuration details.

## Complete the configuration

- **Name:** use a recognizable name, such as `datadog-production`
- **Site:** enter the site hostname only; do not include `https://`
- **API key:** enter the Datadog API key
- **Application key:** enter the Datadog application key
- **Allowed capabilities:** select Metrics, Logs, or Traces according to the permissions granted above

The form currently labels the application key optional, but the Datadog query APIs used by this integration require it.

## Set the access policy

Use **Read permissions** to control who can access this tool. Attaching it requires write permission on the workbench. Use **Write permissions** to control who can edit the tool's configuration and access policy.

After saving, attach the configured tool to a workbench and run a query for one of its enabled capabilities.
