---
title: Notification configuration
description: Configure fine-grain notification routing with CRDs
---
## Overview

Plural has the ability to deliver notifications to most common chat solutions, particularly:

- Slack
- Teams

We also have roadmapped support for other channels like PagerDuty and OpsGenie. Further you can configure your own notification routing rule sets, directing notifications for specific pipelines, clusters, etc to different channels as needed.

The system has two main constructs, a notification `sink` and `router`. Sinks contain all the details needed to connect to an external notification system, and will serve as a pointer to it in routers. Routers link to sinks and can also configure whitelists for the events the router subscribes to alongside filter rules to only deliver for specific subsets of the system (e.g. only deliver `service.update` events for a specific cluster).

## Configure Notification Sinks

The simplest way to configure a notification sink is via the UI. You can simply go to `/notifications/sinks` in your instance of the Plural Console, then click the `Create Sink` button in the top right, you should see a wizard like the one below:

![](/assets/deployments/notification-sink.png)

Enter an incoming webhook url for Slack or Microsoft Teams, and a name for the sink, and you should be set to start configuring notifications to that system. If you need help finding an icon for Plural as you create the Slack/Teams bot to own the incoming webhook, feel free to use any of our own icons, or just download this one:

![](/favicon-128.png)

## Set Up Your first Router

The best way to configure these is using kubernetes CRDs. If you're unfamiliar with our operator, it might be worth checking out our docs {% doclink to="plural_features_continuous_deployment_deployment_architecture" %}here{% /doclink %} to get an understanding of how it works and how the resources are structured. Once you're ready though, the exact configuration is pretty simple, you will just create two CRDs like below:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: NotificationSink
metadata:
  name: slack
  namespace: infra # can be any namespace you wish of course
spec:
  type: SLACK
  name: slack
---
apiVersion: deployments.plural.sh/v1alpha1
kind: NotificationRouter
metadata:
  name: firehose
  namespace: infra
spec:
  events: ['*'] # can be any of (service.update pipeline.update pr.create pr.close cluster.create or *)
  # optional filters to control which entities you deliver notifications for
  filters:
    - clusterRef:
        name: some-cluster
        namespace: infra
    - serviceRef:
        name: some-service
        namespace: infra
    - pipelineRef:
        name: some-pipeline
        namespace: infra
    - regex: pluralsh/.* # currently used only to filter using the repo slug for PR notifications
  sinks:
    - name: slack # notice this points to the sync resource above
      namespace: infra
```

Once those resources are configured, you should start to see events trickle in to whatever channel you've configured them against.

## Supported Notification Events

At the moment, a router will receive the following notification events:

* `service.update`
* `pipeline.update` 
* `pr.create` 
* `pr.close` 
* `cluster.create`
* `stack.run`

We'll update this list as future events are defined.

## Supported Notification Sink Types

We currently support the following notification sink types:

* `SLACK` - a Slack incoming webhook
* `TEAMS` - a Microsoft Teams incoming webhook
* `PLURAL` - in-app Plural Console notifications

The `PLURAL` sink type is unique in that it pairs with the `bindings` attribute of the sink to control what users receive notifications.  For instance you could use:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: NotificationSink
metadata:
  name: sres
  namespace: infra # can be any namespace you wish of course
spec:
  type: PLURAL
  name: sres
  bindings:
  - groupName: sre
```

To only deliver in-app notifications to the `sre` group.  This doesn't work for external notification sinks because Console user groups are not meaningful constructs in Slack, Teams, etc.
