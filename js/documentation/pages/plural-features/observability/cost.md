---
title: OpenCost Configuration
description: Configure cost visibility with OpenCost on Plural
---

## What You'll Get

Plural's leverages OpenCost to gather cost data for any deployed cluster.  This works by:

* deploying an opencost instance per cluster, which acts as a lightweight agent exposing no web ui.
* configuring an extractor to periodically scrape that instance and ship the data to our central store for historical retrieval and analysis.

This provides a seamless multi-cluster experience for opencost data, and when combined with Plural's built-in deployment knowledge and AI capabilities, can also automate the remediation of overprovisioning with our PR generation capabilities.

* Displaying saturation data for common compute controllers within Kubernetes, like deployments and statefulsets
* Displaying cluster-level aggregate metrics for CPU, memory, pod saturation, etc.
* Extracting network metrics for service mesh observability, in particular Istio and Cilium both have their standard network metrics shipped to Prometheus.  We can use them to provide a holistic network graph and also use that information to inform Plural AI.

Once configured, if you go to a compute-related resource and click on the `Metrics` tab, you'll see:

A Full fleet-wide dashboard for cost information:

![](/assets/observability/fleet-cost.png)

A dashboard for a specific cluster:

![](/assets/observability/cluster-cost.png)

A namespace granularity breakdown of costs in a cluster:

![](/assets/observability/namespace-cost.png)

And recommendations to right-size workloads in a cluster:

![](/assets/observability/cost-recs.png)

## Deploy out of our Service Catalog

Plural ships by default with a full [Service catalog](/plural-features/service-catalog) to easily deploy solutions across your stack, among them a setup of OpenCost.  This will:

* set up the opencost agent across your fleet
* configure the kubecost extractors to ship cost data back to Plural

To deploy out of our storage catalog, go to `Service Catalog` -> `devops` -> `kubecost-setup` and fill out the wizard, it requires no advanced configuration and should just require you to provide a branch name for the PR to configure it.

## Manually Configure against an Existing OpenCost Instance

You can also use an existing OpenCost/Kubecost install with Plural for aggregation.  To do this, simply make sure the following CRD is installed everywhere (installation of the Plural Operator is required):

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: KubecostExtractor
metadata:
  name: default
spec:
  interval: "1h"
  recommendationThreshold: "1"
  kubecostPort: 9090
  kubecostServiceRef:
    name: kubecost-cost-analyzer # this is the kubernetes service hosting the kubecost api
    namespace: kubecost
```