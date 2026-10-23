---
title: Cloud
description: Query AWS, GCP, or Azure through a Plural cloud connection
---

Use the Cloud integration to give a workbench read-only SQL access to the resources in an AWS account, GCP project, or Azure subscription. The tool is backed by a **cloud connection**, which stores the provider credentials, and by Plural's cloud query service, which exposes cloud resources as [Steampipe](https://steampipe.io/) tables. After you configure the tool once, you can attach it to one or more workbenches and ask questions about your cloud inventory and configuration in natural language.

This guide uses the Plural Console UI. For the complete list of integrations and general tool behavior, see [Workbench tools](/plural-features/workbenches/integrations/tools).

## Prerequisites

Before you begin, make sure you have:

* An AWS account, GCP project, or Azure subscription to query, and read-only credentials for it. See [Provider credentials](#provider-credentials).
* A cloud connection for that account, or admin access in Plural Console to create one.
* Permission in Plural Console to create a configured tool and edit the target workbench.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

### Provider credentials

Each cloud connection holds credentials for one provider:

| Provider | Credentials | Recommended access |
|---|---|---|
| AWS | Optional access keys, optional region, optional role to assume | `ReadOnlyAccess`, or a narrower read-only policy |
| GCP | Project ID and a service account key | `roles/viewer` on the project, or narrower read-only roles |
| Azure | Subscription, tenant, client ID, and client secret of a service principal | `Reader` on the subscription |

For AWS, Plural can authenticate in two ways:

* **Ambient identity.** Leave the access keys empty and Plural's cloud query service uses its own AWS identity, such as a workload identity (IRSA or EKS Pod Identity) on a self-hosted install.
* **Access keys.** Enter an access key ID and secret for a dedicated IAM user.

In both cases you can also enter an **Assume role ARN**, and Plural assumes that role for every query. Use a role when the target account differs from the account of the base identity. The base identity needs `sts:AssumeRole` on the role, and the role's trust policy must allow it.

## Capabilities

The Cloud tool is read-only. Every query runs in a read-only database transaction, so the agent cannot create, modify, or delete cloud resources through it.

Tables are named with the provider prefix, such as `aws_ec2_instance`, `gcp_compute_instance`, or `azure_compute_virtual_machine`. Columns follow the provider APIs. For details, see the Steampipe [AWS](https://hub.steampipe.io/plugins/turbot/aws/tables), [GCP](https://hub.steampipe.io/plugins/turbot/gcp/tables), and [Azure](https://hub.steampipe.io/plugins/turbot/azure/tables) table references.

When the tool is attached, the workbench agent can call:

* **cloud_tables** — lists the available tables. An optional filter matches part of the table name, such as `ec2` or `storage`.
* **cloud_schemas** — returns the columns and types for one or more exact table names.
* **cloud_query** — runs a PostgreSQL-compatible SQL query against the tables and returns the matching rows as JSON.

Attaching a Cloud tool also enables the workbench's infrastructure subagent, which uses these operations to investigate your cloud resources.

## Create a cloud connection

Skip this section if a suitable cloud connection already exists and you have read access to it.

Creating, updating, and deleting cloud connections requires admin access in Plural Console. Create the connection before you start the Cloud tool form. The tool form also offers a link to create a connection, but it returns you to the Cloud tool form afterward.

1. In Plural Console, open **Settings → Cloud Connections**.
2. Click **Add cloud connection**.
3. Enter a **Name** for the connection and select the **Provider**.
4. Enter the provider fields:
   * **AWS:** **Access key ID** and **Secret access key** (both optional when Plural uses an ambient identity), **Region**, and **Assume role ARN** (optional).
   * **GCP:** **Project ID** and **Service account key (JSON)**. Paste the full contents of the service account's JSON key file.
   * **Azure:** **Subscription ID**, **Tenant ID**, **Client ID**, and **Client secret**.
5. Under **Read permissions**, add the users or groups that may use this connection when creating tools.
6. Click **Save**.

For a step-by-step walk-through of the provider-side setup, click **Setup guide** on the connection form.

{% callout severity="warning" %}
Connection names are unique. Saving a connection with the name of an existing connection overwrites that connection's settings, which affects every tool that uses it. Choose a new name unless you intend to replace the existing connection.
{% /callout %}

{% callout severity="warning" %}
Treat access keys, service account keys, and client secrets as secrets. Plural stores them encrypted and does not display them after saving. Never include credential values in screenshots, workbench prompts, or job output.
{% /callout %}

## Create the Cloud tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **AWS**, **GCP**, or **Azure** card and click **Add tool**.

### Configure the connection

On the **Configuration** step, enter:

* **Name** — a recognizable name for the tool, such as `aws_prod`. The name must start with a lowercase letter, end with a letter or number, and contain only lowercase letters, numbers, dots, and underscores.
* **AWS connection**, **GCP connection**, or **Azure connection** — the cloud connection to query. The list shows only connections you have read access to.

Click **Next**.

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. After the creation confirmation appears, the tool is available under **Workbenches → Configured Tools**.

## Attach the Cloud tool to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the Cloud tool by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the Cloud tool.
4. Click **Save**.

The configured Cloud tool now appears in the workbench's **Tools** section.

## Query your cloud from a workbench

Open the workbench's **Launch** tab and describe the question in the prompt box. Name the resource type, any filters such as region, tag, or state, and the result you want. The agent discovers the right tables, inspects their columns, and writes the SQL.

Try prompts such as:

* **Inventory:** `List all running EC2 instances with their instance type, availability zone, and Name tag.`
* **Security posture:** `Find S3 buckets that do not block public access and summarize their policies.`
* **GCP:** `List GKE clusters in the project with their location, node count, and Kubernetes version.`
* **Azure:** `Which virtual machines in the subscription are stopped but not deallocated?`
* **Cross-checking:** `Compare the security groups attached to the prod EKS cluster's nodes and flag rules open to 0.0.0.0/0.`

You can include SQL directly for precise results, for example `select instance_id, instance_type from aws_ec2_instance where instance_state = 'running'`.

Submit the job and watch its activity stream. To verify the integration, confirm that the job completes, open its Cloud tool activity, and check that the query succeeded and returned rows. A tool activity entry can also contain a provider error, so its presence alone does not verify the connection. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

## Query behavior and limits

Keep these behaviors in mind:

* **Queries are read-only.** Statements that write data fail.
* **AWS region scope.** AWS queries cover the connection's **Region**. If the connection has no region, they cover only `us-east-1`. Create one connection per region if you need others.
* **GCP project scope.** GCP queries cover the connection's **Project ID**.
* **Azure subscription scope.** Azure queries cover the connection's **Subscription ID**.
* **Table filters are case-sensitive** substring matches on the table name. Without a filter, the agent sees every table for the connection's provider.
* **Timeouts.** A single query can run for up to five minutes. Queries over many accounts, regions, or large resource types are slower, because each query calls the provider APIs live.
* **Permissions limit results.** Tables or columns the credentials cannot read return errors or empty results.

## Troubleshooting

### Authentication or permission errors

* For AWS, confirm that either the access keys or Plural's ambient identity are valid, and that the base identity can assume **Assume role ARN** when it is set.
* For GCP, confirm that the service account key is the full JSON key file, that the key has not been disabled, and that **Project ID** matches the project the account has roles in.
* For Azure, confirm that the client secret has not expired and that the service principal has `Reader` on the subscription.
* To rotate credentials, an admin edits the connection under **Settings → Cloud Connections** and enters the replacement secret. Existing secret values are never displayed.

### No rows are returned

* For AWS, confirm that the resources exist in the connection's region. Without a region, only `us-east-1` is queried.
* Confirm that the credentials can list the resource type. A read-only role scoped to a few services returns nothing for other services.
* Ask the agent to run the query without filters to check that the table returns any data.

### A query fails

* An unknown table or column usually means the agent guessed a name. Ask it to list matching tables and inspect their schemas first.
* A timeout means the query was too broad. Narrow it by region, resource type, or columns.
* A read-only transaction error means the query attempted to write. The Cloud tool cannot change resources.

### The Cloud tool is unavailable

* Confirm that the tool appears under **Workbenches → Configured Tools**.
* Verify that your user or group has read access to the configured tool.
* If the connection list on the tool form is empty, ask an admin to create a connection or grant you read access to an existing one.
* Reopen the workbench's **Tools** dialog and confirm that the Cloud tool is selected.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
* [Running workbench jobs](/plural-features/workbenches/running-jobs)
* [Lambda](/plural-features/workbenches/integrations/tools/lambda), [Cloud Run](/plural-features/workbenches/integrations/tools/cloud-run), and [Azure Function](/plural-features/workbenches/integrations/tools/azure-function) tools, which reuse cloud connections to invoke functions
