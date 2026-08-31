---
title: Plural Workspace Layout
---

Plural ensures the state of all installed applications are stored in a git repository, under a common format. Broadly, a working workspace should look like

```shell {% showHeader=false %}
app-one/
-> helm/app-one # helm chart for k8s manifests
-> terraform/* # terraform modules
-> terraform/main.tf # main terraform entrypoint
-> build.hcl # configuration for build commands for that application
-> deploy.hcl # configuration for deployments
-> output.yaml # outputs from various tools (terraform, helm, etc) that can be imported into inputs for others
-> manifest.yaml # metadata about the plural app itself

app-two/
-> helm/app-two
-> terraform/*
-> build.hcl
-> deploy.hcl
-> output.yaml
-> manifest.yaml

context.yaml
workspace.yaml
```

## {build | deploy}.hcl

The build/deploy files manage two things:

- the steps needed to build or apply a specific repository in plural
- change detection between runs

We'll automatically sha whatever subtree is needed to run any stage in the file, and if there's no detectable change, ignore the command. This is especially useful for avoiding slow, unneeded terraform commands

## context.yaml

This is where the results to all bundle installs are stored. It can also be manually extended if there's some customization that a user wants to apply beyond what the bundle provided.

## workspace.yaml

Stores base cloud provider setup for this repository. It uses a general format modelled after GCP, but the mapping to the resources in other clouds is pretty straightforward.

On each app installation, you have the option of inheriting this setup, or reconfiguring for the specific app.

## .gitattributes

The git attributes file specifies the filters that drive secret encryption. This file should not be tampered with, unless the user is confident they know what they're doing.

We'll also add additional `.gitattributes` as different modules add or create secrets that might be stored in the repo (eg ssh keys).
