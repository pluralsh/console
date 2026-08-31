---
title: Plural upgrade assistant
description: Navigating Kubernetes API deprecations and upgrades with Plural
---
The Kubernetes API is constantly evolving, and APIs are periodically changed and deprecated. Before upgrading the Kubernetes version running on a cluster, you must make sure any API changes are addressed.

Plural will automatically surface deprecated resources detected on the cluster, and link to the location in Github for review.

Deprecations will be surfaced at the cluster level in the "Status" column of the Clusters table. Clicking the "Deprecations" label will trigger a modal with all detected deprecated resources:

![](/assets/deployments/deprecated-resources.png)

To see deprecations relevant to a specific service, navigate to the Service details page. You'll see a notification that you can click to review any changes that need to be made:

![](/assets/deployments/deprecation-warning.png)

To see it all end-to-end, here's a demo video to show the experience:

{% embed url="https://youtu.be/fJmTrELoAKU" aspectRatio="16 / 9" /%}
