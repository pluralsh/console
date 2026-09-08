---
title: CLI Quickstart
description: >-
  A guide to getting up and running with Plural using our CLI in under 30
  minutes.
---

## Overview

This is a guide on how to get Plural running using our CLI. If you prefer an in-browser Cloud Shell experience with all the dependencies loaded, check out our _Quickstart Guide for Cloud Shell_ {% doclink to="cloud-shell" %}here{% /doclink %}. You can see the process in the video here or follow the instructions step-by-step, especially for unique cloud providers:

{% embed url="https://www.youtube.com/watch?v=O9BEwphNDLc&ab_channel=Plural" aspectRatio="16 / 9" /%}

## Prerequisites

**You will need the following things to successfully get up and running with Plural:**

- **A cloud account**: Plural will deploy directly into your cloud provider of choice. We currently support AWS, GCP and Azure. Follow [this guide](/reference/configuring-cloud-provider) to make sure it's set up correctly.
- **Your cloud provider CLI installed and configured**: Plural will leverage your cloud provider's CLI tooling in places. If need to install the cloud provider CLI, or aren't sure if it's properly configured you can follow [this guide](/reference/configuring-cloud-provider).
- **A GitHub/GitLab account**: Plural manages the state of your infrastructure using a git-ops workflow, so you'll need an account with a version control management system. Follow the instructions {% doclink to="gitops-setup" %}in our GitOps resources{% /doclink %} for more information.

## Install Plural CLI

The Plural CLI and its dependencies are available using a package manager for your system. For Mac, we recommend using [Homebrew](https://brew.sh/). For other operating systems, curl and our Docker image should work universally.

{% tabs %}
{% tab title="Mac" %}
The brew tap will install Plural, alongside Terraform, Helm and kubectl for you. If you've already installed any of those dependencies, you can add `--without-helm`, `--without-terraform`, or `--without-kubectl`

```
brew install pluralsh/plural/plural
```

{% callout severity="warning" %}
Before you proceed, make sure that your cloud provider CLI is properly configured and updated to the latest version. If you aren't sure about how to do that, refer to [this guide](/reference/configuring-cloud-provider). If it is not configured correctly, Plural will fail and won't be able to create resources on your behalf.
{% /callout %}
{% /tab %}

{% tab title="curl" %}
You can download the binaries attached to our GitHub releases [here](https://github.com/pluralsh/plural-cli/releases). There will be binaries for linux, windows, and mac and all compatible platforms.

For example, you can download v0.6.2 for Darwin arm64 via:

```
VSN=$(curl --silent -qI https://github.com/pluralsh/plural-cli/releases/latest | awk -F '/' '/^location/ {print  substr($NF, 1, length($NF)-1)}')
curl -L -o plural.tgz 'https://github.com/pluralsh/plural-cli/releases/download/${VSN}/plural-cli_${VSN#v}_Darwin_arm64.tar.gz'
tar -xvf plural.tgz
chmod +x plural
mv plural /usr/local/bin/plural
```

{% callout severity="info" %}
Be sure to download the CLI version for your target OS/architecture, the above example is only valid for ARM Mac's
{% /callout %}

You will still need to ensure helm, terraform and kubectl are properly installed, you can find installers for each here

| Tool      | Installer                                                                                                                  |
| --------- | -------------------------------------------------------------------------------------------------------------------------- |
| helm      | [https://helm.sh/docs/intro/install/](https://helm.sh/docs/intro/install/)                                                 |
| terraform | [https://learn.hashicorp.com/tutorials/terraform/install-cli](https://learn.hashicorp.com/tutorials/terraform/install-cli) |
| kubectl   | [https://kubernetes.io/docs/tasks/tools/#kubectl](https://kubernetes.io/docs/tasks/tools/#kubectl)                         |

{% callout severity="warning" %}
Before you proceed, make sure that your cloud provider CLI is properly configured and updated to the latest version. If you aren't sure about how to do that, refer to [this guide](/reference/configuring-cloud-provider). If it is not configured correctly, Plural will fail and won't be able to create resources on your behalf.
{% /callout %}
{% /tab %}

{% /tabs %}

## Create your Plural Repo

Plural stores all configuration artifacts within a Git repository that we will create on your behalf. Run this command within the directory that you want to store your configuration in:

```
plural init
```

The Plural CLI will then guide you through a workflow using GitHub/GitLab OAuth to create a repository on your behalf.

{% callout severity="info" %}
If you'd prefer to set up Git manually vs. using OAuth, refer to our guide on {% doclink to="gitops-setup" %}setting up Gitops{% /doclink %}.
{% /callout %}

Along the `plural init` workflow, we will set the Git attributes to configure encryption and configure your cloud provider for this installation.

You will also be asked whether you want to use Plural's domain service and if so, what you want the subdomain to be. We recommend that you use our DNS service if you don't have any security reasons that prevent you from doing so. The hostname that you configure with us will determine where your applications are hosted. For example, if you enter `singular.onplural.sh`, your applications will be available at `$APP_NAME.singular.onplural.sh`.

This process will generate a `workspace.yaml` file at the root of your repo that stores your cloud provider configuration information.

{% callout severity="info" %}
Currently we're limited to a one cluster to one repo mapping, but eventually that will be relaxed. We also strongly urge users to store installations in a fresh, separate repository to avoid our automation trampling existing files.
{% /callout %}

## Install Plural Applications

To view the applications you can install on Plural, head to [this link](https://app.plural.sh/explore/public).

Once you've selected your applications, you can install Plural bundles using our interactive GUI. To start the GUI, run:

```
plural install
```

You should see a window pop up like the below:
![](/assets/cli-quickstart/local-installer.png)

You can then follow a guided flow to select and configure your applications.

Alternatively, you can run `plural repos list` on the CLI or Cloud Shell and find the bundle name specific to your cloud provider.

Run `plural bundle list <app-name>` to find installation commands and information about each application available for install. For example, to list the bundle information for the Plural console, a powerful Kubernetes control plane:

Here's what we get from running `plural bundle list console`:

```
+-------------+--------------------------------+----------+--------------------------------+
|    NAME     |          DESCRIPTION           | PROVIDER |        INSTALL COMMAND         |
+-------------+--------------------------------+----------+--------------------------------+
| console-aws | Deploys console on an EKS      | AWS      | plural bundle install console  |
|             | cluster                        |          | console-aws                    |
+-------------+--------------------------------+----------+--------------------------------+
```

To install applications on Plural, run:

```
plural bundle install <app-name> <bundle-name>
```

We can try this out by installing the Plural Console:

{% tabs %}
{% tab title="AWS" %}

```
plural bundle install console console-aws
```

{% /tab %}

{% tab title="GCP" %}

```
plural bundle install console console-gcp
```

{% /tab %}

{% tab title="Azure" %}

```
plural bundle install console console-azure
```

{% /tab %}
{% /tabs %}

As of CLI version 0.6.19, the bundle name can be inferred from primary bundles, optionally shortening the command to:

```
plural bundle install console
```

After running the install command, you will be asked a few questions about how your app will be configured, including whether you want to enable **Plural OIDC** (single sign-on). Unless you don't wish to use Plural as an identity provider due to internal company security requirements, you should enter (Y). This will enable you to use your existing `app.plural.sh` login information to access Plural-deployed applications. This will add an extra layer of security for applications without built-in authentication.

Ultimately all the values you input at this step will be stored in a file called `context.yaml` at the root of your repo.

## Build and Deploy your Kubernetes Cluster and Applications

With all bundles installed, run:

```shell {% showHeader=false %}
plural build
plural deploy --commit "initial deploy"
```

This will generate all deployment artifacts in the repo, then deploy them in dependency order.

It is common for `plural deploy` to take a fair amount of time, as is the case with most Terraform and cloud infrastructure deployments. Network disconnects can cause potential issues as a result. If you're running on a spotty network, or would like to step out while it's running we recommend running it in [tmux](https://github.com/tmux/tmux/wiki).

Once `plural deploy` has completed, you should be ready to log in to your application at `{app-name}.{domain-name}`.

{% callout severity="warning" %}
You may experience a delayed creation of your SSL certs for your applications. ZeroSSL currently may take up to 24 hours to provide you your certs.
{% /callout %}

**And you are done!** You now have a fully-configured Kubernetes cluster and are free to install applications on it to your heart's content. If you want to take down any of your individual applications, run `plural destroy <APP-NAME>`. If you're just testing us out and want to take down the entire thing, run `plural destroy`.
