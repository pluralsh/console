---
title: Plural Admin Console
---

The plural admin console serves a number of different roles

- managing automated upgrades delivered from the kubernetes api
- serving as a thin grafana to visualize application metrics and logs
- serving as a built-in k8s dashboard for all plural apps in the cluster, along with providing app-level health checking
- being the touchpoint at which incidents can be filed with the owner of an application

# Installation

The plural console is installable like any other plural app, to find the available bundles, just run:

```shell {% showHeader=false %}
plural bundle list console
```

Then once you've found an eligible bundle to install, do (for the aws bundle as an example):

```shell {% showHeader=false %}
plural bundle install console console-aws
plural build --only console
plural deploy
```

# Dependencies

The console takes over the gitops flow for managing plural apps for you, but that also means it needs your git repo set up appropriately. Currently we require these details (although we'll support other git operating modes in the future):

- the remote url should be ssh not https
- you have a passphraseless ssh key with access to that repo you can offer to the console
- the ssh key should have write perms to the repo
