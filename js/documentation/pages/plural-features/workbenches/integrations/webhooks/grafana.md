---
title: Grafana
description: Receive Grafana alert payloads in Plural
---

A Grafana webhook delivers alert payloads from Grafana into Plural. Create the signing secret in Plural, then set it as the HTTP Basic auth password on the Grafana contact point. Use any non-empty username. It does not start a job until a workbench trigger matches the payload.

## Capabilities

* $DOCSTUB: describe the events this source delivers, from the webhook implementation and the setup guide in Setup.
* $DOCSTUB: leave agent-callable operations off this page. Those belong on the matching tool page when one exists.

## Setup

Create the webhook source in Console and follow the inline setup guide for the URL, authentication, and provider settings. That guide is maintained at `js/console/public/setup-guides/webhooks/grafana.md`.

## Related

* [Webhooks](/plural-features/workbenches/integrations/webhooks)
