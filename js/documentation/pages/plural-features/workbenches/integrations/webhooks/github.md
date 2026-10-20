---
title: GitHub
description: Receive GitHub issue and pull request events in Plural
---

A GitHub webhook delivers issue and pull-request events from GitHub into Plural. Create the signing secret in Plural, then enter the same value in the GitHub webhook **Secret** field. It does not start a job until a workbench trigger matches the payload.

## Capabilities

* $DOCSTUB: describe the events this source delivers, from the webhook implementation and the setup guide in Setup.
* $DOCSTUB: leave agent-callable operations off this page. Those belong on the matching tool page when one exists.

## Setup

Create the webhook source in Console and follow the inline setup guide for the URL, authentication, and provider settings. That guide is maintained at `js/console/public/setup-guides/webhooks/github.md`.

## Related

* [Webhooks](/plural-features/workbenches/integrations/webhooks)
