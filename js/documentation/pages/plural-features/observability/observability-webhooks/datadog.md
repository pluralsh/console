---
title: Datadog Observability Webhook Integration
description: Configure Datadog webhook to view metrics, logs, and alerts inside the Plural Console. 
---

## Quick Setup 

To install the Datadog Observability Webhook, navigate to the `Settings` tab in the Console sidebar. Go to `Global Settings > Observability > Webhooks`. 

![](/assets/observability/observability-webhooks-tab.png)

Click `Add webhook`. Give your Datadog Observability Webhook a name and fill in your `base64 encoded` Datadog `basic auth` token.

![](/assets/observability/datadog-webhook-config.png)

Take the `URL` that is generated and configure your Datadog webhook (in your Datadog UI) to point to it. 

![](/assets/observability/datadog-webhook-url.png)

You will then be able to see metrics, logs, and alerts from Datadog as they appear in your Plural Console Logs.

