---
title: Auto cancellation
description: Automatically cancel complex Terraform applies when alarms fire
---

## Overview

One common issue when managing changes to Kubernetes infrastructure is due to the very long running nature of the operations, cluster upgrades can take hours for large node counts, there is plenty that can go wrong and immense wasted man-hours babying your infrastructure automation ensuring that does not happen.

Plural helps solve this by polling the monitors you likely have set up to ensure infrastructure health in tools like Datadog or NewRelic, and automatically cancelling your IaC when they fire.  Due to our close management of the commands themselves, we'll gracefully shut them down, ensuring things like annoying state locks are cleaned up and no resources are left dangling.  We're basically trying to automate one of the most boring but labor-intensive parts of your DevOps workflow.

Setting this up is really simple, you'll need to create an `ObservabilityProvider` resource and then set a list of `observableMonitors` on your stack.

## Create an ObservabilityProvider

To do this in one swoop for datadog, create resources like:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: datadog
  namespace: stacks
stringData:
  apiKey: YOUR_API_KEY
  appKey: YOUR_APP_KEY
---
apiVersion: deployments.plural.sh/v1alpha1
kind: ObservabilityProvider
metadata:
  name: datadog
spec:
  type: DATADOG
  name: datadog
  credentials:
    datadog:
      name: datadog
      namespace: stacks
```

{% callout severity="info" %}
You can also create this in the UI to avoid the secret creation, and reference it by name without the `credentials` block
{% /callout %}

## Add `observableMetrics` to your Stack

An example setup for this is here:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: InfrastructureStack
metadata:
  name: cancellable-stack
spec:
  name: cancellable-stack
  detach: false
  type: TERRAFORM
  approval: true
  manageState: true
  observableMetrics:
  - identifier: My Datadog Monitor
    observabilityProviderRef:
      kind: ObservabilityProvider
      name: datadog
      namespace: stacks
  repositoryRef:
    name: infra
    namespace: infra
  clusterRef:
    name: mgmt
    namespace: infra
  git:
    ref: main
    folder: stacks/cancellable-stack
```

What qualifies for `identifier` in each observable metric varies on provider, in Datadog, it's simply a monitor name, in NewRelic, it's an entity. 

{% callout severity="info" %}
This puts a lot of ownership on the monitors you are configuring.  That requires a measure of craftmanship and insight into what the cluster is doing that requires a devops engineer.  You can also split the logic into multiple monitors for completeness, and the system will poll all of them, cancelling if any fire.    
{% /callout %}

## Remediation post-cancellation

How you take action once your stack is cancelled is ultimately going to depend on the failure mode causing the incident.  Here are some examples:

1. If it was ultimately a red herring due to workloads restarting loudly on the cluster, simply let it settle, then restart the stack run in the UI.
2. If there's some underlying flaw in the setup of the change, either k8s version incompatibility, bad node AMI, etc, make the change in your Git repository, push it to the tracked branch, and let the stack run resume with the corrected code.
3. If it's a flaw of a downstream service, correct it there, then restart the stack run in the UI.

By and large, you should have full freedom to respond, and the various touchpoints in the Plural product will make the process as self-serviceable as possible.