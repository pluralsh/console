---
title: ElasticSearch Configuration
description: Configure multi-cluster Log Aggregation with Plural
---

## What You'll Get

Plural's built-in log support allows you to query logs at either the Service or Cluster level, depending on your permissions to those respective resources. Service logs are relevant for developer personas, whereas cluster logs are typically useful for platform engineers and Kubernetes admins.

The `Logs` tab includes standard features like text-based search, facet filtering, and time filtering:

![](/assets/getting-started/log-tab.png)

By default, live logs refresh every 10 seconds, which is ideal for monitoring deployments or watching for real-time issues. To view historical logs, simply scroll down. The view displays logs from the last 15 minutes by default. To adjust the lookback window (for example, when investigating an incident from an hour ago), use the time window modal:

![](/assets/getting-started/log-retention.png)

By default, logs are shown up to the current time, and you can adjust this via the datetime modal to investigate historical issues. This is particularly useful when you need to correlate logs with a specific incident time. Note: the default log retention is 7 days, so logs older than that are not queryable.

![](/assets/getting-started/log-date-time.png)

To filter logs by keywords or phrases, type into the search bar. Common use cases include searching for error messages, specific request IDs, pod names, or error codes. You can also search for multi-word phrases to narrow down results, as shown below.

![](/assets/getting-started/log-keyword-search.png)

Click on any log entry to see its context and filtering labels that Plural has aggregated from the underlying cluster and service metadata. This reveals valuable information like namespace, pod name, container, and service tags:

![](/assets/getting-started/log-context.png)

Click on "Show more context" to see logs before and after the selected log. This is especially useful for understanding what led to an error or what happened immediately after:

![](/assets/getting-started/log-expanded-context.png)

Click any label to filter by that attribute. For example, click a namespace label to see all logs from that namespace, or a pod label to isolate logs from a specific pod. Labels can be combined with each other and with the time window and datetime filters for powerful, targeted log searches. This is particularly effective when troubleshooting issues in specific microservices or namespaces:

![](/assets/getting-started/log-labels-added.png)

{% callout severity="info" %}
**Pro Tip:** For the most effective troubleshooting workflow, start with a time window around your incident, add a text search for error keywords or request IDs, then use label filters to narrow down to the specific service or pod. This combination quickly surfaces relevant logs even in high-volume environments.
{% /callout %}

## Deploy out of our Service Catalog

Plural ships by default with a full [Service catalog](/plural-features/service-catalog) to easily deploy solutions across your stack, among them a setup of ElasticSearch + Logstash using to support robust multi-cluster log aggregation.  This has an additional benefit of also serving as a vector store for additional data used by our AI engine if you wish to enable that.  In total this will set up:

* ElasticSearch using the [ECK operator](https://www.elastic.co/guide/en/cloud-on-k8s/current/k8s-deploy-eck.html)
* Logstash (also using ECK) to aggregate logs at the cluster level and ship them to the singular ElasticSearch Instance

{% callout severity="info" %}
The system is made to be modular, and can support other logging backends.  If you're interested in using another one, let us know and we'll add it to our roadmap!
{% /callout %}

To deploy out of our storage catalog, go to `Self Service` -> `Service Catalog` -> `devops` -> `elastic` -> `create PR` and fill out the wizard, it should look something like this:

![elastic-setup](/assets/observability/elastic-setup.png)

{% callout severity="warning" %}
We recommend using at least 100Gi for storage if you have a fairly large fleet, this is simply due to the log volume emitted by Kubernetes being quite large at the baseline.  ECK can very easily be tuned post-hoc if you size it too small as well.

Also be sure the cluster you're deploying to has a working ingress setup, since it'll assume external-dns + cert-manager are there to set up DNS and TLS.
{% /callout %}

The generated PR will have configured:

* a deployment of ElasticSearch to store log and vector data 
* Logstash for log extraction, filtering and remote shipping to ElasticSearch
* the configuration of the setup in the `DeploymentSettings` CRD to register them with Plural

## Custom Resource Configuration

If you were to do this manually with an existing ElasticSearch setup, you'd need to manually wire configuration like the following:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: DeploymentSettings
metadata:
  name: global # this is a singleton resource that is always at this location
  namespace: plrl-deploy-operator
spec:
  logging:
    enabled: true
    driver: ELASTIC
    elastic:
      host: https://{your-elastic-fqdn}
      user: plrl
      index: plrl-logs-* # or whatever index pattern you're currently using with Logstash
      passwordSecretRef:
        name: plrl-elastic-user
        key: password
```

## Log-Based Alerts

Once log aggregation is wired up, you can build alerts directly off of your log stream using Plural's log-based monitors.  A monitor is a recurring, server-side log query that evaluates on a cron schedule, buckets results over a lookback window, and fires a Plural alert whenever an aggregate (max, min, or avg) crosses a threshold you define.  Because monitors run as part of the Plural control plane, they work multi-cluster out of the box and reuse the same ElasticSearch (or other) backend you've already configured for log search.

### How it works

Each monitor is attached to a Service Deployment and is composed of three pieces:

* **Log query** -- the query string, lookback `duration` (e.g. `1h`, `30m`), `bucketSize` used to aggregate matches over time (e.g. `5m`), an `operator` (`AND` / `OR`) for multi-term queries, and an optional list of key/value `facets` (for example `namespace=payments` or a pod label) layered on top of the query.
* **Threshold** -- an `aggregate` function (`max`, `min`, or `avg`) applied across the bucketed counts and a numeric `value` the aggregate must cross to trigger the alert.
* **Schedule** -- a standard cron expression (for example `*/5 * * * *` or `@daily`) that controls how often the monitor is re-evaluated.

On every tick, Plural runs the log query against your configured logging driver, builds a vector of per-bucket counts, and aggregates that vector into a single number. If it crosses the threshold the monitor transitions to `firing` and a Plural alert is created (or updated); when the next evaluation comes back under the threshold, the alert is automatically marked `resolved`. Alerts produced this way are first-class `Alert` objects in the Plural Console -- they show up alongside Datadog/Grafana alerts and can be routed through your existing notification routers, attached to AI insights, and surfaced in service dashboards.

### Creating a monitor in the UI

![create-monitor](/assets/observability/create-monitor.png)


Monitors are managed per-service under `Service` -> `Observability` -> `Monitors`. Click `Create Monitor` and the wizard walks through three steps:

1. **Log query** -- pick a lookback duration and bucket size, type a query, and optionally pin facet filters from the same label picker used in the standard logs view.  A live preview of matching log lines is rendered in the side panel so you can validate the query before saving.

![log-query](/assets/observability/log-query.png)

2. **Threshold config** -- enter the numeric threshold and choose the aggregate (`max` / `min` / `avg`) used to compare against it.

![threshold-config](/assets/observability/threshold-config.png)

3. **Description** -- give the monitor a name, an evaluation cron, an optional severity, and an optional alert template.

![monitor-description](/assets/observability/monitor-description.png)


The alert template is rendered with [Liquid](https://shopify.github.io/liquid/) and has access to the full monitor context, so you can interpolate dynamic values into the alert body, e.g.:

```text
Monitor {{ monitor.name }} is firing for {{ monitor.service.name }} on
{{ monitor.service.cluster.name }} -- threshold {{ monitor.threshold.value }}
({{ monitor.threshold.aggregate }}) was breached.
```

If no template is provided, Plural renders a default Markdown summary that includes the firing service, the threshold settings, and a JSON dump of the log query and the bucketed results that triggered the alert -- handy for triage and for the AI insight engine.

### Routing and AI integration

Because log-based alerts flow through the same `Alert` pipeline as third-party providers, they automatically benefit from the rest of the Plural observability stack:

* **NotificationRouters** can fan them out to Slack, email, or any configured sink, with the same severity- and tag-based filters used for other alert sources.
* **Alert resolutions** authored against firing monitors are vectorized into ElasticSearch (see below) and reused by Plural AI to suggest fixes the next time a similar monitor fires.
* **AI Insights** can correlate the firing monitor with recent service logs, deployments, and pull requests to produce a Root Cause Analysis without you having to leave the alert view.

![monitor-insight](/assets/observability/monitor-insight.png)

This makes log-based monitors a particularly low-friction way to bootstrap alerting on a new service: write a query you'd run in the logs view anyway, set a threshold, and Plural handles scheduling, deduplication, notification, and AI-assisted triage from there.

## ElasticSearch as a Vector Store

Beyond the single-pane-of-glass benefits, log data significantly enhances the dataset used by Plural AI, which is why we highly recommend enabling log aggregation for production deployments. We lean on ElasticSearch as the default log store because it's a broadly usable data store with recent support for vector search, enabling Plural AI to:

* Vectorize and search historical Pull Requests (gathered from [establishing a SCM webhook](/getting-started/how-to-use/scm-connection#add-an-scm-provider-webhook))
* Vectorize and search historical alert resolutions
* Provide Root Cause Analysis (RCA) and troubleshooting via Plural AI Insights
* ...and more coming soon!