---
title: Cost Optimization
description: Controlling the cost of your cluster and applications.
---

Out of the box, Plural performs a lot of optimizations behind the scenes with our built-in autoscaler that schedules workloads efficiently across your infrastructure. However, there are some efforts you can make to monitor and optimize this cost.

## Console Scaling Recommendations

The Plural Console offers scaling recommendations for certain apps, some of which can be immediately applied from the Console.

To do this, select your desired application from the Application Overview tab and then click on the `Components` tab in the sidebar on the left. Then click on the specific component you want to get recommendations for and you will see a `Scaling` button in the top right.

When you click on the `Scaling` button, if you see `Apply` in the bottom right, you can immediately enforce the recommendations given by Plural.

## Node Optimization

### Helping the Autoscaler

The Plural autoscaler does a good job of scheduling new Pods and resources onto nodes that can handle the extra workload, but cannot delete Pods, as it could lead to potentially destructive scenarios. Because of this, you may end up
with imbalanced nodes that are overworked or underworked.

To address this, you'll need the Plural Console installed. Head to the `Nodes` tab in the sidebar on the left of the Console. Here, you'll see the utilization of resources for all of your nodes. You are looking for nodes that are overworked or underworked, which can be observed by seeing if cpu and/or memory is in the red (overworked) or close to zero and green (underworked).

To delete these nodes, hit the red trash can symbol to the right of the problematic node and it will deprovision, letting the autoscaler schedule the Pods it was running on a different node.

{% callout severity="warnninng" %}
As with any operations that involve taking down resources, you will likely encounter a small amount of downtime as your resources get rescheduled.
{% /callout %}

### Node Sizing at Scale

If you deploy a lot of applications and resources, you may start seeing cost go up faster than expected due to the fixed cost of installing Kubernetes and its services on every node. This fixed Kubernetes tax per node varies based on your cloud provider. Essentially, if a small node is used, it will be a higher percentage of your usage than a large node, making the cost differences more evident at large scale with small node sizes.

To control this, it is recommended that you increase your node sizes to accommodate more resources and applications per node, reducing the amount of times you're paying the fixed cost for running Kubernetes.
Learn how to modify your node types [here](/operations/cluster-configuration#modifying-node-types).

## Kubecost

To monitor your cost and keep an eye out for spend, you can install [Kubecost](/applications/kubecost) on Plural just how you would install any other application. Check out their documentation [here](https://docs.kubecost.com/).
