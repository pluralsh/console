---
title: Plural
description: Receive observability events from another Plural environment
---

A Plural observability webhook delivers alert payloads from one Plural environment into another. Creating the source registers a webhook URL and signing secret in the sending environment. It does not start a job until a workbench trigger matches the payload.

## Capabilities

* Placeholder: describe the events this source delivers, from the webhook implementation and the setup guide in Setup.
* Placeholder: leave agent-callable operations off this page. Those belong on the matching tool page when one exists.

## Setup

Create the webhook source in Console and follow the inline setup guide for the URL, signing secret, and provider settings. That guide is maintained at `js/console/public/setup-guides/webhooks/plural.md`.

## Related

* [Webhooks](/plural-features/workbenches/integrations/webhooks)
