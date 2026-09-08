---
title: Monitoring Setup
description: Set up common monitoring agents
---

## Datadog

The `datadog` add-on will automatically install Datadog's onto a cluster for you. You can also create a global service to automate installing the agent throughout your fleet. It will ask for your datadog api and app keys, and automatically inject them into the agent. We'll also manage future upgrades of the agent so you don't have to.

Once the agent is installed, there are often additional features that need to be enabled to get the full Datadog ecosystem functioning. We recommend visiting their docs [here](https://docs.datadoghq.com/containers/kubernetes/installation/?tab=operator#next-steps)

## Grafana Agent

The `grafana-agent` add-on will deploy an instance of grafana's metrics agent on a cluster in a self-serviceable way. The agent simplifies the process of configuring remote writes for prometheus (without needing a full prometheus db) and also integrates with the standard coreos `ServiceMonitor` and `PodMonitor` CRDs.

Our configuration for the agent will ask you to:

- input hostname and basic auth information for prometheus
- input hostname and basic auth information for loki

And will immediately start shipping logs to both on your behalf. We'd recommend also leveraging our global service setup to simplify rolling it out to your entire fleet. You'll be able to distinguish metrics via the `cluster` label in both Loki and Prometheus, which will map to the cluster handle attribute to ensure it's human-readable.

If you haven't set up Loki or Prometheus, and you created your console via Plural, we recommend using our Mimir and Loki setups in the Plural marketplace. They're completely self-serviceable and will properly configure the underlying S3/GCS/Azure Blob Storage needed to persist the metrics data. In addition, our Grafana distribution auto-integrates them as datasources, so there's no additional setup needed there.

If you set up your console via BYOK, then feel free to let us know and we can help you set them up as part of our support packages.
