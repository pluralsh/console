---
title: Quickstart with the Plural CLI
description: Deploying your services using the Plural CLI.
---

## Overview

This guide goes over how to deploy your services with the Plural CLI. At the end of this tutorial, you will have:

- Provisioned new clusters, and/or deployed the Plural Deployment Operator on your existing clusters.
- Imported the Git repositories containing your code and manifests.
- Deployed your code onto your clusters of choice.
- Optionally updated any configurations and permissions for the clusters and services.

{% callout severity="info" %}
If you want to get started quickly or want us to manage the Plural experience for you, we strongly recommend using [Plural Cloud](/getting-started/first-steps/plural-cloud).

We'll handle hosting Plural for you, and it also comes with automatic integration with GitHub and observability with Elastic and Prometheus set up by default.  It should significantly reduce DevOps TCO, especially for resource-constrained teams.
{% /callout %}

## Install the Plural CLI

The Plural CLI is available on Homebrew; a single-line installation can be done with:

```sh
brew install pluralsh/plural/plural
```

If you are using a machine that is not compatible with Homebrew,
we recommend downloading a pre-built release from GitHub and installing it onto your machine's path.
The latest release can be found on [GitHub](https://github.com/pluralsh/plural-cli/releases/latest)
or downloaded with the following commands:

{% codetabs  %}
```yaml  {% title="Linux AMD64" %}
VERSION=$(curl -sL https://api.github.com/repos/pluralsh/plural-cli/releases/latest | jq -r '.tag_name' | tr -d v)
curl -L https://github.com/pluralsh/plural-cli/releases/latest/download/plural-cli_"$VERSION"_Linux_amd64.tar.gz | tar zx
```
```yaml  {% title="Linux ARM64" %}
VERSION=$(curl -sL https://api.github.com/repos/pluralsh/plural-cli/releases/latest | jq -r '.tag_name' | tr -d v)
curl -L https://github.com/pluralsh/plural-cli/releases/latest/download/plural-cli_"$VERSION"_Linux_arm64.tar.gz | tar zx
```
```yaml  {% title="macOS AMD64" %}
VERSION=$(curl -sL https://api.github.com/repos/pluralsh/plural-cli/releases/latest | jq -r '.tag_name' | tr -d v)
curl -L https://github.com/pluralsh/plural-cli/releases/latest/download/plural-cli_"$VERSION"_Darwin_amd64.tar.gz | tar zx
```
```yaml  {% title="macOS ARM64" %}
VERSION=$(curl -sL https://api.github.com/repos/pluralsh/plural-cli/releases/latest | jq -r '.tag_name' | tr -d v)
curl -L https://github.com/pluralsh/plural-cli/releases/latest/download/plural-cli_"$VERSION"_Darwin_arm64.tar.gz | tar zx
```
```yaml  {% title="Windows AMD64" %}
VERSION=$(curl -sL https://api.github.com/repos/pluralsh/plural-cli/releases/latest | jq -r '.tag_name' | tr -d v)
curl -L https://github.com/pluralsh/plural-cli/releases/latest/download/plural-cli_"$VERSION"_Windows_amd64.tar.gz | tar zx
```
```yaml  {% title="Windows ARM64" %}
VERSION=$(curl -sL https://api.github.com/repos/pluralsh/plural-cli/releases/latest | jq -r '.tag_name' | tr -d v)
curl -L https://github.com/pluralsh/plural-cli/releases/latest/download/plural-cli_"$VERSION"_Windows_arm64.tar.gz | tar zx
```
{% /codetabs %}

## Onboard to Plural and install the Plural Console

If you haven't already, you'll need to follow the Plural guide to install Console. There are two recommended ways to do this:

- {% doclink to="getting_started_first_steps_existing_cluster" %}Bring Your Own Cluster{% /doclink %} - you've created a Kubernetes cluster your way with all the main prerequisites. You can use Helm to install the management plane and then use the Console to manage itself from there.
- `plural up` - a single command to create a new management cluster on the major clouds, wire up a basic GitOps setup and get you started.

Both are flexible, and even if you choose the BYOK method, we recommend looking into some of our example `plural up` repos to get ideas on how to use our CRDs and Terraform provider with all the other tools they'll commonly touch. You can see an example `plural up` repository [here](https://github.com/pluralsh/plural-up-demo).

## Use `plural up` to create your first management console

First you'll want to follow our guide {% doclink to="getting_started_first_steps_cli_quickstart" %}here{% /doclink %} to install our CLI. Once you've done this, run:

```sh
plural up # optionally add --service-account <email> if you want to use a service account to group manage this console
```

{% callout severity="warning" %}
`plural up` is best run in an empty repo. That will let it OAuth to GitHub/GitLab and create the repository for you, alongside registering pull deploy keys to register it in your new console.
{% /callout %}

This will do a few things:

- create a new repo to house your IaC and YAML manifests
- execute Terraform to create the new cluster
- execute another Terraform stack to provision the GitOps setup for the Plural Console and any other services you'd like to deploy from that repo

We've also generated a README that should give an overview of how the repo can be used for things like:

- creating and registering new workload clusters with terraform
- adding new services in the main infra repo
- handling updates to the cluster terraform at your own pace

## Set Up the `plural cd` CLI

If you'd like to configure the Plural CLI to communicate with your new Console instance, the configuration process is simple: you'll need to set your Console URL and Console token. Set them with:

```
plural cd login
```

{% callout severity="info" %}
You'll need to generate an access token to perform this command, it'll be available at https://{your-console-url}/profile/access-tokens
{% /callout %}

Alternatively, you can set the env vars `PLURAL_CONSOLE_URL` and `PLURAL_CONSOLE_TOKEN`, or set them directly in the config file `~/.plural/console.yml`.

To validate that your CLI is properly configured, run `plural cd clusters list`