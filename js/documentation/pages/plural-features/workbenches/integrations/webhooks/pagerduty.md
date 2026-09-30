---
title: PagerDuty
description: Receive PagerDuty alert payloads in Plural
---

A PagerDuty webhook delivers alert payloads from PagerDuty into Plural. PagerDuty generates the signing secret and shows it once. Paste that secret into Plural, then set the PagerDuty webhook URL to the Plural URL. It does not start a job until a workbench trigger matches the payload.

## Capabilities

* $DOCSTUB: describe the events this source delivers, from the webhook implementation and the setup guide in Setup.
* $DOCSTUB: leave agent-callable operations off this page. Those belong on the matching tool page when one exists.

## Setup

Create the webhook source in Console and follow the inline setup guide for the URL, authentication, and provider settings. That guide is maintained at `js/console/public/setup-guides/webhooks/pagerduty.md`.

## Related

* [Webhooks](/plural-features/workbenches/integrations/webhooks)
