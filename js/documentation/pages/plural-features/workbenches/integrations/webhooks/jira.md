---
title: Jira
description: Receive Jira issue events in Plural
---

A Jira webhook delivers issue events from Jira into Plural. Jira admin webhooks have no shared-secret field. Store a signing secret on the Plural source, deliver the webhook over HTTPS, and limit it with JQL. It does not start a job until a workbench trigger matches the payload.

## Capabilities

* Placeholder: describe the events this source delivers, from the webhook implementation and the setup guide in Setup.
* Placeholder: leave agent-callable operations off this page. Those belong on the matching tool page when one exists.

## Setup

Create the webhook source in Console and follow the inline setup guide for the URL, authentication, and provider settings. That guide is maintained at `js/console/public/setup-guides/webhooks/jira.md`.

## Related

* [Webhooks](/plural-features/workbenches/integrations/webhooks)
