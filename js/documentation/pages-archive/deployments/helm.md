---
title: Helm Repository Sources
description: Use Helm repositories in OCI or over HTTP as artifact sources
---

## Overview

There are some use-cases where git is a clunky storage layer for kubernetes manifests, the most common one is when using third party vendored charts from an external helm repository. Plural builds on top of FluxCD's source controller to provide robust support for most of the helm storage formats, including standard HTTP repositories and OCI repos in most major registry providers.

A quick rundown of what you can get by using a helm repository directly:

- no need to manually vendor charts into git
- easier mechanisms to manage multiple versions of the same app created via a helm chart across your fleet
- leveraging OCI scanning capabilities built into your image registry

This model isn't for all usecases as it still has drawbacks (introducing a new packaging mechanism into your deployment architecture), but some users will find it useful.

## Install Flux source controller

The first step is to simply install the Flux source controller. We already package an add-on for this. You should simply ensure it's installed in your management cluster to be able to get going.

## Create initial helm repositories

We recommend you manage the helm repositories via GitOps, yourself. Defining them is a simple matter of crafting a crd in a git repo of your choice, we have an example [here](https://github.com/pluralsh/console/tree/master/test-apps/helm-repositories), and then creating a CD service to sync that folder into your management cluster.

Here's a very simple repository CRD you can use for testing as well:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: HelmRepository
metadata:
  name: podinfo
spec:
  interval: 5m0s
  url: https://stefanprodan.github.io/podinfo
```

## Create a service from helm

From there you should be able to use the same deploy service flow to create a new service, but select `helm` to toggle from git as the primary source, then chose the repository, chart, and version you want to provision. If you're creating it via the UI, we'll often be able to provide a full dropdown wizard of all this information for you like so:

![](/assets/deployments/helm-service.png)

## Overriding values

You can provide your own values file in the service details UI or via our API directly.

It's worth noting that this can also support templating secrets like a git-sourced helm service as well if you'd like to parameterize your values even more precisely.

## Multi-Source Helm

Occasionally you'll want to source the helm chart itself from an external helm repository, but store the values in git. This is also supported by configuring the service to have both a git and helm source, and using the `helm.valuesFiles` fields on the service to specify which files precisely should be used.
