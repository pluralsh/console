---
title: Workbench tools
description: Configure external integrations for your workbench agents to call
---

## Overview

Tools are reusable external integrations that workbench agents can call as part of a job. They are configured globally and then attached to individual workbenches, so the same Datadog connection or MCP server can be shared across multiple workbenches without re-entering credentials.

Navigate to **Workbenches → Integrations** to browse the available tool types, or **Workbenches → Configured tools** to manage the tools you have already set up.

![](/assets/workbenches/workbench-tools-list.png)


## Tool types

### Plural native integrations

These capabilities are built directly into the workbench runtime and require no external credentials or tool setup. They are enabled per-workbench via the capability toggles in [Step 1 of the creation wizard](/plural-features/workbenches/configuration#step-1-workbench-setup).

| Capability | What the agent can access |
|---|---|
| **Services** | Plural-managed service deployments — health status, rollout history, configuration, and associated cluster |
| **Stacks** | IaC stack runs, Terraform state summaries, run logs, and failure details for Plural-managed stacks |
| **Kubernetes** | Full Kubernetes API access across your managed clusters — list and describe any resource (Deployments, Pods, Events, ConfigMaps, etc.) |
| **Pod logs** | Raw container stdout/stderr streamed directly from Kubernetes pods |
| **Vulnerabilities** | Trivy vulnerability findings auto-associated with Plural-managed services |
| **Metrics** | Query your configured Prometheus-compatible metrics backends via Plural's observability integration |
| **Log aggregation** | Search and aggregate logs from your configured backends (Loki, Elastic, etc.) via Plural's observability integration |

All native integrations respect your existing RBAC — enabling a capability here does not grant the agent access it would not otherwise have.

### Observability

| Tool | What the agent can do |
|---|---|
| **Prometheus** | Query metrics from a Prometheus-compatible endpoint |
| **[Datadog](/plural-features/workbenches/tools/datadog)** | Query metrics, logs, and traces from the Datadog API |
| **Loki** | Query log streams from a Loki-compatible endpoint |
| **Elastic** | Query and search indices in an Elasticsearch cluster |
| **Tempo** | Query distributed traces from a Grafana Tempo endpoint |
| **Jaeger** | Query distributed traces from a Jaeger backend |

### Source control

| Tool | What the agent can do |
|---|---|
| **GitHub** | Read repositories, list PRs, and (in Write mode) open pull requests |
| **GitLab** | Same as GitHub for GitLab projects |
| **Bitbucket Cloud** | Same as GitHub for Bitbucket Cloud |
| **Bitbucket Data Center** | Same as GitHub for self-hosted Bitbucket Data Center |

### Messaging

| Tool | What the agent can do |
|---|---|
| **Slack** | Post messages and read channel history |
| **Microsoft Teams** | Post messages to Teams channels |

### Issue tracking

| Tool | What the agent can do |
|---|---|
| **Atlassian (Jira)** | Create, read, and update Jira issues |
| **Linear** | Create and update Linear issues |

### Cloud

Cloud tools are backed by a **cloud connection** (an IAM role or credential set stored in Plural) and give the agent SQL-queryable access to cloud-provider data via Plural's Steampipe-based cloud query service.

Rather than asking the LLM to reason about cloud state from natural language descriptions, the agent uses three dedicated tools to work with cloud data precisely:

| Agent tool | What it does |
|---|---|
| `cloud_tables` | Lists available SQL tables for the cloud connection — the agent calls this first to discover what data it can query |
| `cloud_schema` | Returns the column schema for a specific table |
| `cloud_query` | Executes a PostgreSQL-compatible SQL query against the cloud account's data |

The agent is also always equipped with a **calculator tool** that evaluates arithmetic expressions deterministically. This means any aggregation, percentage change, or cost total is computed — never estimated by the LLM — eliminating hallucination on numerical results.

| Provider | Coverage |
|---|---|
| **AWS** | Cost Explorer, EC2, RDS, S3, CloudWatch, EKS, and more |
| **GCP** | Compute Engine, GKE, Cloud SQL, Billing, and more |
| **Azure** | VMs, AKS, storage, Azure Monitor, and more |

### Custom

| Tool | Description |
|---|---|
| **HTTP** | A custom REST endpoint. You define the request shape (URL, method, headers, body, JSON schema) and the agent can call it as a named tool |
| **MCP** | Any [Model Context Protocol](https://modelcontextprotocol.io) server. Plural handles authentication and audit-logs every call |


## Creating a tool

From **Workbenches → Integrations**, click the card for the tool type you want to add.

![](/assets/workbenches/workbench-tool-setup.png)

Each tool type has a setup form for its required credentials (API keys, endpoint URLs, tokens, etc.). For many tool types, Plural includes an inline **setup guide** in the form that walks you through where to find the credentials and what permissions to grant — look for the guide link next to the relevant fields.

![](/assets/workbenches/workbench-tool-setup-guide.png)

Once saved, the tool appears in **Workbenches → Configured tools** and can be attached to any workbench.


## Attaching tools to a workbench

Tools are attached to workbenches during creation (Step 5) or via **Edit** on an existing workbench. A workbench can only call the tools explicitly attached to it — this gives you fine-grained control over what each agent can reach.


## Tool policies

Tools are governed in two layers: who can attach and edit the tool, and what the agent is allowed to do when it calls the tool during a job.

### Access policy

Each tool has its own **read** and **write bindings**:

* **Read permissions** control who can see the tool and attach it to a workbench
* **Write permissions** control who can modify the tool configuration and access policy

Users or groups without at least read access cannot attach the tool to their workbenches. This is particularly useful for restricting production cloud connections or sensitive API credentials.

Configure bindings by opening a tool in **Workbenches → Configured tools** and clicking **Edit**. If both lists are empty, access falls through to the parent project's policy.

Built-in tools also enforce authorization against the resource they access at execution time. For example, Kubernetes tools federate the user running the job to the target cluster using their Console email and groups. The Kubernetes API server then applies that identity's native RBAC rules to each request. Attaching or enabling a built-in tool therefore does not give the agent broader access than the user already has.

### Workbench policies

[Workbench policies](/plural-features/policy-management/workbench-policies) evaluate each matching tool call the agent makes. They extend tool access bindings with Rego rules that can:

* **Deny** a call based on the actor, tool name, and arguments — for example, blocking deletes in `kube-system`
* **Automatically approve** a call that would otherwise wait for human approval

A policy cannot make an unavailable tool accessible or grant permissions the actor does not already have. Attach a policy to a workbench (optionally scoped to selected tool names) from **Security → Policies**, or use a binding policy to attach it automatically. See [Workbench policies](/plural-features/policy-management/workbench-policies) for the input schema, decision model, and examples, and [Simulating and testing policies](/plural-features/policy-management/simulating-policies) to inspect real tool-call inputs before writing rules.
