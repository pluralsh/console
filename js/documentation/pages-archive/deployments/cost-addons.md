---
title: Cost Management Setup
description: Set up Kubecost Cloud
---

## Kubecost Cloud Agent

Kubecost is the most mature kubernetes-focused cost management solution, and Kubecost Cloud is the most turnkey way to get going with it in a multi-cluster fleet. To install Kubecost you'll first want to create an account [here](https://www.kubecost.com/products/kubecost-cloud/) and you'll be given an agent key. Save that, then install the `kubecost-cloud` addon in our addon library, providing that agent key.

You can then configure a global service to replicate the agent throughout your fleet automatically.
