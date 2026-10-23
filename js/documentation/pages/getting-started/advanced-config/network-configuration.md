---
title: Network configuration
description: Modifying ingress controller and setting up public/private endpoints for your console
---

## Overview

There are a few strategies you can take to harden the network security of your console or align it with how you typically secure Kubernetes ingresses. We'll note a few of these here.

## Bringing Your Own Ingress

Our Helm chart can reconfigure the ingress class for your console. This could be useful if you already have an ingress controller with CIDR ranges and WAF setups built in. The Helm values change is relatively simple:

```yaml
ingress:
  ingressClass: <new-ingress-class>
  # potentially you might also want to add some annotations
  annotations:
    new.ingress.annotations: <value>

kas:
  ingress:
    ingressClass: <new-ingress-class>
```

Both KAS and the console leverage websockets for some portion of their functionality. In the case of the console, the websockets are also far more performant with connection stickiness in place. Some ingress controllers have inconsistent websocket support (or require paid versions to unlock it), which is worth keeping in mind.

Also, we configure the ingresses with cert-manager by default. Some orgs will set a wildcard cert at the ingress level, in which case you'd want to disable the ingress-level certs.

## Public/Private Ingress

Another setup we support is splitting the console ingress between public and private. This allows you to host the entirety of the Console's API in a private network, while exposing only the subset the deployment agents need to poll our APIs. These APIs are minimal; they only provide:

- read access to the services deployable to an agent
- a ping endpoint for a given cluster sending the cluster version and a timestamp
- the ability to update the components created for a service by an agent

This is a relatively easy way to ensure network connectivity to end clusters in a pretty broad network topology, but there are of course other more advanced setups a team can attempt. The basic setup for this is as follows:

```yaml
ingress:
  ingressClass: internal-nginx # or another private ingress controller

externalIngress:
  hostname: console-ext.your.subdomain # or whatever you'd like to rename it
```

This will create a second, limited ingress exposing only the APIs listed above via path routing. In this setup, we'd also recommend you leave the KAS service on a similar network as the external ingress.

There are still additional tactics you can use to harden this setup. For instance, adding CIDR ranges for the NAT gateways of all the networks your target clusters reside on can provide robust firewalling for the ingresses you've configured.
