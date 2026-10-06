# Author workbench integration docs

This file is a prompt for an agent. It is not a published page. The docs site only indexes Markdown under `js/documentation/pages/`.

Each run turns workbench integration stubs into public docs and opens **one pull request**. Do not open a second pull request in the same run.

## What to change

Published pages live under `js/documentation/pages/plural-features/workbenches/integrations/`.

A stub still contains a `$DOCSTUB:` bullet. Finished pages do not. [Datadog](../pages/plural-features/workbenches/integrations/tools/datadog.md) is finished. Leave it as the style target. Do not rewrite it.

In one run, replace the `$DOCSTUB:` bullets on the stubs you can verify from the sources below. Prefer a reviewable set: one subsection (tools, webhooks, or chatbots) or a related group of integrations. Leave the remaining stubs for the next run.

Do not add a vendor page that is not already stubbed. Plural-native workbench capabilities stay on the tools overview. They are not per-vendor pages. That includes Kubernetes, stacks, services, pod logs, vulnerabilities, built-in metrics, and built-in log aggregation, documented under [Plural native integrations](../pages/plural-features/workbenches/integrations/tools.md#plural-native-integrations).

## Page shape

Read [Datadog](../pages/plural-features/workbenches/integrations/tools/datadog.md) before writing. Match its depth for a tool page. Use only facts from the sources in the next section. Include a section when those sources support it, and leave it out when they do not. Do not force every page through the same headings.

A tool page can include, in this order:

- Front matter `title` and `description`, then an opening paragraph on what the agent can call.
- **Prerequisites**, including credential creation in the vendor product.
- **Capabilities**, naming each real operation and the permissions required for it when a source states them.
- **Create the tool**: Console fields, an access-policy step, and attaching the tool to a new or existing workbench.
- **Using it from a workbench**: example prompts, and query behavior or limits when the implementation states them.
- **Troubleshooting** for failures the setup guide or implementation describes, such as authentication, permissions, or empty results.
- A link back to [Workbench tools](/plural-features/workbenches/integrations/tools).

Use a screenshot only when that file already exists in the docs assets. Do not invent image paths.

A webhook page uses the same standard for an inbound source: which events arrive, how to create the source in Console, how to register the URL and signing secret in the vendor product, and troubleshooting the guide actually describes. Do not list agent-callable operations on a webhook page. Point job binding at [Webhook triggers](/plural-features/workbenches/automation#webhook-triggers). Link back to [Webhooks](/plural-features/workbenches/integrations/webhooks).

A chatbot page uses the same standard for a conversation that starts a job: how a mention is received, how the bot replies, app credentials, and channel binding. Keep it separate from the tool the agent calls during a job. The Slack chatbot page and the Slack tool page are different integrations. Link back to [Chatbots](/plural-features/workbenches/integrations/chatbots).

Finished pages must be self-contained. Do not send the reader to the inline Console setup guide for required steps. When the sources support them, include prerequisites, credential or app creation, Console fields, channel binding, usage, and troubleshooting. You may mention that Console also shows an inline guide, but that guide is not a substitute for public instructions.

Do not copy a setup guide verbatim. Rewrite it as public documentation in the second person. Leave no repository paths or `$DOCSTUB:` text in the page.

The files under `js/console/public/setup-guides/` are embedded Console assets, not pages on the documentation site. Do not turn their repository paths into `/setup-guides/...` links. Link only to an existing published documentation route or an authoritative external page.

Add links when they help the reader continue to relevant setup or conceptual documentation. Link the first natural mention, avoid duplicate nearby links, and never construct a URL by translating a repository path.

Do not invent permissions, API methods, Console fields, screenshots, or image paths.

Name operations the way the code names them, without the configured-tool suffix. `slack_post_message_#{name}` is the operation `slack_post_message`.

## Sources

Read these before writing. Trace executable behavior through the complete call path instead of relying only on module documentation, comments, or tool descriptions. For behavioral claims, request construction and tests take precedence over module documentation, comments, tool descriptions, and setup guides. Do not infer user-visible behavior such as threading from an identifier or method name alone.

If sources disagree, follow the implementation for runtime behavior and the setup guide and Console form implementation for credentials and fields. If none of the allowed sources establishes a permission or behavior, omit it.

1. The matching setup guide under `js/console/public/setup-guides/{tools,webhooks,chatbots}/`. Doc slugs use hyphens. Some guide filenames use underscores or a shorter name:

   | Doc page | Setup guide |
   |---|---|
   | `tools/jira-datacenter.md` | `tools/jira_datacenter.md` |
   | `tools/bitbucket-datacenter.md` | `tools/bitbucket_datacenter.md` |
   | `tools/azure-devops.md` | `tools/azure_devops.md` |
   | `tools/victoria-logs.md` | `tools/victoria_logs.md` |
   | `webhooks/new-relic.md` | `webhooks/newrelic.md` |
   | `webhooks/bitbucket-datacenter.md` | `webhooks/bitbucket_datacenter.md` |
   | `webhooks/azure-devops.md` | `webhooks/azure_devops.md` |

   Cloud, Lambda, Cloud Run, and Azure Function have no tool setup guide. Use the cloud connection guides instead: `js/console/public/setup-guides/cloud-connections/aws.md` for Lambda, `gcp.md` for Cloud Run, `azure.md` for Azure Function, and all three for Cloud.

2. For chatbots, trace the provider implementation under `lib/console/chat/impl/`, shared behavior in `lib/console/chat/utils.ex`, the inbound webhook controller, and the provider's connector or reply tool. Read relevant tests where they exist. Verify both the inbound event handling and the exact outbound request payload.

3. Agent-callable tools in `lib/console/ai/tools/workbench/`. Integration modules live in `integration/<vendor>/`. Each operation module defines `name/1` and `description/1`. The vendor’s `tools.ex` lists the modules that are actually registered. Treat descriptions as summaries and confirm their claims against the implementation.

4. Query-backed observability tools in `go/cloud-query/internal/tools/` (`provider_*.go` and `lambda/`). The Elixir wrappers that expose them are under `lib/console/ai/tools/workbench/observability/external/`. Cloud SQL tools are `cloud_tables`, `cloud_schema`, and `cloud_query`, described on the tools overview and implemented beside the cloud connection query service.

5. Official vendor API documentation, only when needed to verify permissions or API semantics used by the implementation. Do not use blogs or search-result summaries as sources. Trace every API call used during connection setup, discovery, binding, and normal operation to its required permission. If this reveals that an inline setup guide omits a required permission or step, update both the setup guide and the public page in the same pull request.

## Section indexes

When a stub becomes a real page, update the summary that links to it so the index matches the page:

- [tools.md](../pages/plural-features/workbenches/integrations/tools.md) — the “What the agent can do” cell for that tool.
- [webhooks.md](../pages/plural-features/workbenches/integrations/webhooks.md) — the event description, if the finished page is more specific than the index.
- [chatbots.md](../pages/plural-features/workbenches/integrations/chatbots.md) — the one-line capability for that bot.

Do not move native capabilities off the tools overview into a vendor page.

If you add or move a page, regenerate the route index from `js/documentation` with `yarn generate:route-index`. Editing an existing stub does not require a new route.

## Validation

Before opening the pull request:

- Re-read each behavioral claim against the executable call path and request payload. Pay special attention to reply placement, threading, pagination, defaults, and limits.
- Verify that every internal link resolves to an existing published page and anchor. Do not assume a source file or Console asset has a documentation route.
- Confirm the changed public pages contain no `$DOCSTUB:` markers, repository paths, or `/setup-guides/` links.
- Check that required permissions are consistent between the public page, the inline setup guide, and the API calls the implementation makes.
- Run the relevant documentation formatting and validation commands. If a preview is available, open each changed page and test its links.

## Pull request

Open one pull request against `pluralsh/console`.

Keep `Plural Flow: console`. It is already in [`.github/PULL_REQUEST_TEMPLATE.md`](../../../.github/PULL_REQUEST_TEMPLATE.md). Do not edit that template, and do not uncomment the docs lines in it. A docs preview for every Console pull request is the wrong default.

Add these lines to **this** pull request’s body, without braces:

```
Plural Flow: docs
Plural Preview: docs
```

The title and summary should say which integration pages were expanded and that they now match the implementation and setup guides.
