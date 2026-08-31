---
title: Getting Started using Plural
---

Before getting started with plural, you'll need to install a few dependencies:

- helm
- terraform
- cloud provider cli (awscli, gcloud, az)

In addition, we require a few helm plugins to add additional features (like authenticated chartmuseum and diffing):

```shell {% showHeader=false %}
helm plugin install https://github.com/chartmuseum/helm-push
helm plugin install https://github.com/databus23/helm-diff
```

Finally, you'll want to install the plural cli. This can actually be found using plural's artifact registry here:

```shell {% showHeader=false %}
curl -L https://app.plural.sh/artifacts/plural/plural?platform=${plat}&arch=${arch} > /on/your/path/plural
chmod +x /on/your/path/plural
```

Current values of (plat, arch) are:

| plat  | arch                 |
| ----- | -------------------- |
| linux | amd64                |
| mac   | amd64                |
| mac   | arm64 (for M1 chips) |

You can see them listed here: https://app.plural.sh/repositories/b4ea03b9-d51f-4934-b030-ff864b720df6/artifacts along with download links

## DNS

Plural uses [externaldns](https://github.com/kubernetes-sigs/external-dns) for dns management in k8s. Programmatic registration of domains is not a solved problem at the moment, so we assume you've already set one up and have it available. It is best practice to consolidate your plural resources into a single subdomain to ensure we don't trample existing entries, but it should be safe if you don't as well.

The dns providers we currently support are:

- Route53
- Google Cloud DNS
- Azure DNS

In all cases externaldns is configured to use pod assigned, temporary credentials.

## Git setup

The state of your installation is stored in a fresh git repo. Currently we're limited to a one cluster to one repo mapping, but eventually that will be relaxed. Additionally, the best supported method of authenticating to git using plural is via passphraseless ssh keys. Both GitLab and GitHub support this mode of operation, and you can always choose to use `https://gitlab.plural.sh` if your organization has no existing git-based SCM.

Once your repo has been cloned, run:

```shell {% showHeader=false %}
plural init
```

to log into plural, set the git attributes to configure encryption, and configure your cloud provider for this installation.

## Installation

To install applications on plural, the preferred method is to use our installation bundles, which provide a wizard-like installation process across an apps entire dependency tree. You can view the available bundles by navigating to the app on https://app.plural.sh or listing them via the cli using:

```shell {% showHeader=false %}
plural bundle list <app-name>
```

If the app is paid, you should click on the bundle in the interface to ensure you set up all the subscriptions needed to install the application properly.

Once you've found the bundle you want and are ready to go, run this in the root of your repo:

```shell {% showHeader=false %}
plural bundle install <app-name> <bundle-name>
```

You should be asked a lot of questions about how your app will be configured, which will ultimately spool your configuration to a file called `context.yaml` at the root of your repo.

## Deployment

With all bundles installed, simply run:

```shell {% showHeader=false %}
plural build
plural deploy
```

This will generate all deployment artifacts in the repo, then deploy them in dependency order.

Once you're finished, commit your changes and push them upstream. This will be needed in case you use our admin console, which also uses git for state management:

```shell {% showHeader=false %}
git add . && git commit -m "Initial plural setup"
git push
```

## Log In

Once `plural deploy` has completed, you should be ready to log in. The login credentials are usually available in the values.yaml for the applciation's helm chart. The key name should be pretty self-descriptive, for instance the initial admin password for the plural console is in a key named: `secrets.adminPassword`.

## Upgrading and deploying new apps to an existing cluster

The full `plural build && plural deploy` commands are only necessary if you have a queue of multiple apps to be deployed that you need assistance with sequencing the installations. If there's just a single targeted application to deploy, simply do:

```shell {% showHeader=false %}
plural build --only ${app}
plural deploy
git add . && git commit -m "updated ${app}" # don't forget to commit and push your changes!
git push
```

For the most part, plural console will do all of this for you if you chose to install it.
