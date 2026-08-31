---
title: Setting up GitOps
description: Configuring your version control management to work with Plural.
---

## Overview

Plural defines all of your infrastructure as code, using Helm, Terraform, and YAML files to denote what is being deployed into your cloud provider or on-prem environment. To manage versioning safely, we use a GitOps practice that requires you to store these files in their own Git repository.&#x20;

If you are using the **[Plural Cloud Shell](https://app.plural.sh/shell)**, we handle setting this up for you.

{% callout severity="info" %}
Currently we're limited to a one cluster to one repo mapping, but eventually that will be relaxed. We also strongly urge users to store installations in a fresh, separate repository to avoid our automation trampling existing files.
{% /callout %}

**Plural currently supports the following version control providers:**

- [GitHub](https://github.com/)
- [GitLab](https://about.gitlab.com/)
- [Bitbucket](https://bitbucket.org/product/) (_Follow Manual Git Setup below to use Bitbucket_)

**Support for the following providers is on our roadmap:**

- [Mercurial](https://www.mercurial-scm.org/)

You have two options when setting up a Git repository for use with a Plural workspace:

- **Using Plural OAuth** by running `plural init` anywhere. (_Recommended_)
- **Manual Git Setup** with an empty, configured Git repository beforehand.

## Using Plural OAuth

_Supported for: (GitHub, GitLab)_

To have Plural set up your Git repository, you'll need to have SSH set up with your version control provider. Then, run:

```shell {% showHeader=false}
plural init
```

This will kick off the process of setting up your Plural workspace. Once you've gone through a few setup steps, you'll get the following prompt:\
**`? you're attempting to setup plural outside a git repository. would you like us to set one up for you here?`**

Enter `Y`, pick your version control provider of choice, and you will receive an OAuth screen to let Plural create and manage repositories on your behalf. Note, Plural can only manage repositories that it has created.

If everything goes well, it should look like this:

![](/assets/basic-setup-and-deployment/gitops-terminal.png)

## Manual Git Setup

_Supported for: (GitHub, GitLab, Bitbucket)_

**To set up a Git repository yourself, you'll need a fresh repository with the following requirements:**

- Cloned with SSH
- Must have an initial commit
- Must be in sync with the upstream/origin repository

**If the requirements aren't fulfilled, you'll hit an error in the `plural init` setup process. To get started, follow these steps:**

1. Go to your version control provider and create a fresh repository.
2. Clone the repository to the machine that you'll be running the Plural CLI on.
3. Make sure that the repository has an initial commit (a README works). GitHub and GitLab provide the option to add an initial commit on creation, so choose that.
4. Run `plural init` from the root of the repository.

And you should be good to go!

## GitOps Best Practices

Plural has three basic steps to the deploy process:

1. **Install** a bundle: `plural bundle install <app-name> <bundle-provider>`
2. **Build** your configuration: `plural build`
3. **Deploy** your configuration: `plural deploy`

When `plural build` is completed, you'll notice all of your new configuration has been created in your local repository. In this state, the files are not yet committed or pushed up to your origin repository.

You can manually commit and push the files yourself, _**but we recommend**_ using the `--commit` CLI argument when running `plural deploy`

```
plural deploy --commit "deploying console and dagster"
```

This will commit and push up your configuration changes for you to your origin repository, using the commit message you've specified.
