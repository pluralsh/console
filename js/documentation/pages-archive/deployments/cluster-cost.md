---
title: Optimize Cluster Costs
description: Guidance on Cost Optimization
---

Generally managing Kubernetes costs can be a bit tricky, and there's a few things to understand:

- how the kubernetes node autoscaler works
- how to distinguish base/variable load
- how to optimize with spot instances

In addition, you'll likely want to implement some tooling to add cost visibility to your fleet.

## Install Kubecost on a Plural Cluster

We have a packaged add-on for installing the kubecost cloud agent to any Plural-ingested kubernetes cluster. You'll first want to set up an account on [Kubecost Cloud](https://www.kubecost.com/products/kubecost-cloud/) and then they'll give you some instructions for installing there agent including an agent key. Copy that key, then go to the add-ons tab of Plural Deployments, and click the `kubecost-cloud` add-on. It will ask for that key, enter it in, and click install.

We recommend you configure it as a global service, as that will ensure it's installed and confgured for your entire fleet going forward.

## How Kubernetes Node Autoscaling Works

Kubernetes has its own mechanism of managing autoscaling. Instead of using familiar patterns like EC2 autoscaling groups, ultimately keyed on CPU or memory utilization, kubernetes will add or remove nodes based on whether there are outstanding pods that cannot be scheduled to any worker given the currently configured pod requests.

<<<<<<< Updated upstream
There are also some other constraints that kubernetes will cause autoscaling for, e.g. pods that have scheduling constraints preventing them to be scheduling on the same nodes as other (thus requiring a new node), pods that must be in a specific availability zone or other node pool, pods that must remain due to a PodDisruptionBudget.
=======
There are also some other constraints that kubernetes will cause autoscaling for, eg pods that have scheduling constraints preventing them to be scheduling on the same nodes as others (thus requiring a new node), pods that must be in a specific availability zone or other node pool, pods that must remain due to a PodDisruptionBudget.

> > > > > > > Stashed changes

This does lead to much more powerful autoscaling constructs but can lead to a bit of confusion for new users. To leverage kubernetes autoscaling properly you'll need to be sure you're putting sane resource requests on your pods and also have some of those edge cases in mind.

## Base vs Variable Load

In general, you should always have a firm grasp of the evergreen load needed to run your systems. This is usually non-zero since most programming languages will require some amount of memory to boot and you'll likely want your service on 24/7. Disaggregating these two concepts will make it easier for you to safely purchase reserved instances with your cloud, leading to this model:

- accurately understand base load and purchase full RIs for the entirety of it to lock in that cost
- tune autoscaling to meet any variability (mid-day peaks, seasonality) at minimal cost using on-demand instances

## Spot Instances

Spot instances can radically reduce the cost of some workloads, but they due have significant drawbacks.

- you might not be able to provision them due to market conditions
- you can lose the spot instance at any time due to being outbid

If you have one-off, batch workloads that have relatively low latency (single-digit hours maximum), then those are ideal candidates for spot instance targeting. Examples we've seen are airflow dag jobs, background crons, and occasionally ETL syncs (although they can sometimes be long-running enough to be risky). We'd recommend learning and leveraging the kubernets `Job` and `CronJob` apis if you have any of these patterns, and then potentially configuring them to run on spot.
