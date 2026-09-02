---
title: Prometheus Configuration
description: Configure multi-cluster Prometheus with Plural
---

## What You'll Get

Plural's leverages Prometheus for a few main purposes:

* Displaying saturation data for common compute controllers within Kubernetes, like deployments and statefulsets
* Displaying cluster-level aggregate metrics for CPU, memory, pod saturation, etc.
* Extracting network metrics for service mesh observability, in particular Istio and Cilium both have their standard network metrics shipped to Prometheus.  We can use them to provide a holistic network graph and also use that information to inform Plural AI.

Once configured, if you go to a compute-related resource and click on the `Metrics` tab, you'll see something like:

![](/assets/getting-started/metrics.png)

And cluster saturation views will look like:

![](/assets/getting-started/cluster-metrics.png)

# Deploy out of our Service Catalog

Plural ships by default with a full [Service catalog](/plural-features/service-catalog) to easily deploy solutions across your stack, among them a robust, scale-out setup of Prometheus using [VictoriaMetrics](https://docs.victoriametrics.com/).  This solves a number of key problems with mainline Prometheus:

* Horizontal scaling - Prometheus scales only vertically, which is not an appropriate fit for monitoring large sets of kubernetes clusters which are going to emit a very large set of metrics and increases operational burden. VictoriaMetrics supports a horizontally scalable cluster mode, which solves this entirely
* Inefficient agent mode - Prometheus wasn't built for a remote-write model, and its agent mode still requires effectively a local prometheus store on-cluster.  `vmagent` is a much better implementation and also adds support for other protocols like statsd.  Remote write is necessary for multi-cluster observabilty since you likely cannot ingress into all clusters to perform metrics scrapes.
* Better kubernetes operator implementation - the mainline Prometheus operator has a number of longstanding issues, in particular not supporting volume resizing as discussed [here](https://github.com/prometheus-operator/prometheus-operator/issues/4079)


To deploy out of our storage catalog, go to `Service Catalog` -> `devops` -> `prometheus-setup` and fill out the wizard, it should look something like this:

![prometheus-setup](/assets/observability/prom-setup.png)

{% callout severity="info" %}
Be sure to select a cluster with a working ingress setup, since it'll assume external-dns + cert-manager are there to set up DNS and TLS.
{% /callout %}

The generated PR will have configured:

* a deployment of VictoriaMetrics server to store metrics
* `vmagent` to ship metrics to the server
* the configuration of the setup in the `DeploymentSettings` CRD to register them with Plural


# Custom Resource Configuration

If you were to do this manually with an existing Prometheus setup, you'd need to manually wire configuration like the following:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: DeploymentSettings
metadata:
  name: global # this is a singleton resource that is always at this location
  namespace: plrl-deploy-operator
spec:
  prometheusConnection:
    host: https://{your-prometheus-url}
    user: plrl
    passwordSecretRef:
      name: basic-auth-prom
      key: password
```

Also we expect a `cluster` label on all prometheus metrics which matches the cluster handle in Plural.  If not present, we might not be able to properly correlate metrics with clusters/workloads.  This will be configured out-of-the-box by our `vmagent` setup.