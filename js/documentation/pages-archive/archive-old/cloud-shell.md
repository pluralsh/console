---
title: Cloud Shell
description: This page gives an overview of what the Cloud Shell is.
---

## Quickstart

For a guide on how to get up and running with the Cloud Shell, click [here](/getting-started/cloud-shell-quickstart).

## Overview

We provide a fully managed cloud shell environment with plural cli and all dependencies installed for you to get started on. To create a shell, navigate to [https://app.plural.sh/shell](https://app.plural.sh/shell) and fill out the setup wizard. Note that this will ask for cloud credentials which will be stored in our database to facilitate provisioning, but you can purge your shell at any time to remove access. Once done, this will create a GitHub repository, deploy keys for pushing to it, and create a shell environment with all configuration set up for you to get running quickly. Your fully working shell should look something like this:

{% callout severity="warning" %}
Note that you **must** to manually push any uncommitted changes as your shell might not be persisted through restarts
{% /callout %}

![](</assets/Screen Shot 2022-02-18 at 1.01.22 PM.png>)

If you'd like to sync your shell locally once you've gotten up and running, all you'll need to do is follow the instructions to install the plural cli and run these commands:

```
plural shell sync
plural shell purge # if you want to remove the shell from our servers
```
