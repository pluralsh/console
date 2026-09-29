---
title: Datadog
description: Receive Datadog alert payloads in Plural
---

A Datadog webhook delivers alert payloads from Datadog into Plural. Create the signing secret in Plural. Send it from Datadog as the HTTP Basic auth password, or in a custom auth header. It does not start a job until a workbench trigger matches the payload.

## Capabilities

* Placeholder: describe the events this source delivers, from the webhook implementation and the setup guide in Setup.
* Placeholder: leave agent-callable operations off this page. Those belong on the matching tool page when one exists.

## Setup

Create the webhook source in Console and follow the inline setup guide for the URL, authentication, and provider settings. That guide is maintained at `js/console/public/setup-guides/webhooks/datadog.md`.

## Related

* [Webhooks](/plural-features/workbenches/integrations/webhooks)
