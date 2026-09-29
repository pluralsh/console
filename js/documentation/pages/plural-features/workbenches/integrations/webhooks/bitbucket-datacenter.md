---
title: Bitbucket Data Center
description: Receive Bitbucket Data Center pull request events in Plural
---

A Bitbucket Data Center webhook delivers pull-request events from Bitbucket Data Center into Plural. Create the secret in Plural, then set it as the HTTP Basic auth password on the Bitbucket Data Center webhook. Plural checks the password and ignores the username. It does not start a job until a workbench trigger matches the payload.

## Capabilities

* Placeholder: describe the events this source delivers, from the webhook implementation and the setup guide in Setup.
* Placeholder: leave agent-callable operations off this page. Those belong on the matching tool page when one exists.

## Setup

Create the webhook source in Console and follow the inline setup guide for the URL, authentication, and provider settings. That guide is maintained at `js/console/public/setup-guides/webhooks/bitbucket_datacenter.md`.

## Related

* [Webhooks](/plural-features/workbenches/integrations/webhooks)
