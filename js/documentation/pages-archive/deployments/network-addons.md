---
title: Network Setup
description: Set up Nginx, Cert Manager and ExternalDns to build a full network stack
---

## Overview

The kubernetes network stack has a few main touchpoints:

- Ingress controllers - manage provisioning load balancers for routing external traffic into services within a cluster. These ultimately implement the [Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/) spec and now the [Gateway](https://kubernetes.io/docs/concepts/services-networking/gateway/).
- Cert Manager - the most mature solution in the kubernetes ecosystem for provisioning ssl certificates. We configure it by default to use lets-encrypt, but it also has a very broad range of other certificate issuance mechanisms.
- ExternalDns - a simple controller that can scrape ingress resources and other networking related resources for FQDNs and automatically register them with a dns provider. We currently have self-service configuration for aws, azure, gcp, and cloudflare, but we're happy to help with others as needed.

## Set Up Ingress-Nginx

First you'll want to install the `ingress-nginx` add-on. This is one of the more mature ingress controllers in the ecosystem and has support for things like websockets/grpc and easily integrates with cert manager. It requires a distinct setup on AWS due to their load balancers requiring proxy protocol, so let us know if you are going to deploy to AWS, otherwise it's a one-click setup.

We'd recommend also configuring global services for this to automate provisioning throughout your fleet.

If you'd like to learn more about more advanced uses of it, here are the [docs](https://kubernetes.github.io/ingress-nginx/)

## Set Up Cert Manager

We provide a sane base-install of Cert Manager, using the http01 solver for letsencrypt. All it will ask for is an email for cert issuance notifications that letsencrypt sends as part of their protocol (they can be ignored for the most part).

If you want to set up your own issuers, I'd recommend reading the [docs](https://cert-manager.io/docs/configuration/acme/dns01/) and you are free to either fork our setup or create a new service in Plural defining your own issuer custom resources.

## ExternalDNS

Externaldns is in effect a simple agent that watches a few network-related kubernetes api and diffs against your DNS service to determine if records need to be created or deleted. We provide self-service setups for AWS, GCP, Azure and Cloudflare, and are happy to help with others.

You can also actually run multiple externaldns instances in the same cluster as long as they are not configured to look at the same DNS zone. That can make it easy to support DNS setups that are multi-provider or if you have dev + prod services in the same cluster.

We don't necessarily recommend using a global service for `external-dns` since it is often re-configured differently for each cluster.

## Validating the setup

Once you have all these installed and healthy, you can create a test service to confirm all the independent components work as expected. Our guestbook ingress app is a decent example of this, and can be seen [here](https://github.com/pluralsh/console/tree/cd-scaffolding/test-apps/guestbook)
