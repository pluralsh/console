---
title: Exa
description: Search the web with Exa from a workbench
---

The Exa tool gives a workbench agent web search and page fetching through [Exa](https://exa.ai). Use it when an investigation needs current information from outside your systems, such as vendor status pages, release notes, CVE advisories, or documentation for an error message.

Plural connects to Exa's [hosted MCP server](https://docs.exa.ai/reference/exa-mcp) and enables two of its tools. For the complete list of integrations and general tool behavior, see [Workbench tools](/plural-features/workbenches/integrations/tools).

## Prerequisites

Before you begin, make sure you have:

* Outbound network access from Plural Console to `https://mcp.exa.ai`.
* An Exa API key, unless you rely on the key provided by Plural Cloud or on Exa's keyless access. See [API keys](#api-keys).
* Permission in Plural Console to create a configured tool and edit the target workbench.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

### API keys

Plural uses the Exa API key configured for your Console instance:

* **Plural Cloud** provides a built-in Exa key for workbench use. Plural Cloud instances also include a configured tool named `exa`, attached to the default `plural` workbench.
* **Self-hosted Console** uses the key in the `EXA_API_KEY` environment variable of the Console deployment. With the Console Helm chart, set the `secrets.exaApiKey` value. To create a key, open the [Exa dashboard API keys page](https://dashboard.exa.ai/api-keys), create a key, and copy it immediately. You can name the key and set a rate limit on it in Exa.

If no key is configured, Plural connects to Exa without one. Exa serves keyless connections with free, rate-limited usage and returns `429` errors when that limit is reached.

{% callout severity="warning" %}
The Console form has an **API key (optional)** field, but the current release does not save a key entered there. The tool always uses the instance key described above. On self-hosted Console, set `EXA_API_KEY` on the Console deployment instead of entering the key in the form.
{% /callout %}

## Capabilities

The Exa tool is read-only. The agent can call these operations:

| Operation | What it does |
|---|---|
| `web_search_exa` | Searches the web and returns relevant page content. |
| `web_fetch_exa` | Reads clean content from one or more known URLs. |

Their arguments and result formats are defined by Exa's MCP server, and the agent sees the descriptions and input schemas Exa publishes. Plural enables only these two tools, so other Exa MCP tools, such as advanced search or Exa Agent, are not available. Results are returned to the agent as text.

## Create the Exa tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **Exa** card and click **Add tool**.

### Configure the connection

On the **Configuration** step, enter:

* **Name** — a recognizable name for the tool, such as `web_search`. It must start with a lowercase letter, end with a letter or number, and contain only lowercase letters, numbers, dots, and underscores.
* **API key (optional)** — leave this blank. See the warning in [API keys](#api-keys).

Click **Next**.

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. After the creation confirmation appears, the tool is available under **Workbenches → Configured Tools**.

## Attach Exa to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the Exa tool by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the Exa tool.
4. Click **Save**.

The configured Exa tool now appears in the workbench's **Tools** section.

## Search the web from a workbench

Open the workbench's **Launch** tab and describe what you need in the prompt box. Name the product, version, error text, or URL so the agent can choose between searching and fetching a page.

Try prompts such as:

* `Search the web for the error "x509: certificate signed by unknown authority" with cert-manager 1.14 and summarize the common causes.`
* `Check whether there is a current AWS service health incident affecting EKS in us-east-1.`
* `Fetch https://kubernetes.io/releases/ and list the currently supported Kubernetes minor versions.`
* `Find the CVE advisory for the vulnerability reported in our nginx image and summarize the fixed versions.`

Submit the job and watch its activity stream. To verify the integration, open an Exa tool activity and check that the call returned results. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

{% callout severity="info" %}
Search queries leave your environment and are sent to Exa. Avoid prompts that would make the agent search for secrets, internal hostnames, or customer data.
{% /callout %}

## Troubleshooting

### Rate limit errors

* A `429` error means the connection is using Exa's keyless rate limits or has reached the key's own limit. On self-hosted Console, set `EXA_API_KEY` on the Console deployment, or raise the key's rate limit in the Exa dashboard.

### The agent does not see the Exa operations

* Confirm that Plural Console can reach `https://mcp.exa.ai`, including through any egress proxy or firewall. If the connection fails when a job starts, the job runs without the Exa operations rather than failing.
* Confirm that the Exa tool is attached to the workbench.

### The Exa tool is unavailable

* Confirm that the tool appears under **Workbenches → Configured Tools**.
* Verify that your user or group has read access to the configured tool.
* Reopen the workbench's **Tools** dialog and confirm that the Exa tool is selected.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
* [Running workbench jobs](/plural-features/workbenches/running-jobs)
