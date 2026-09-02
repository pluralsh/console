---
title: Github Actions Example
description: Call Plural from a simple Github Actions workflow
---

## Overview

We've built a basic FastApi [example app](https://github.com/pluralsh/plrl-cd-demo) to demonstrate how to easily integrate Plural Deployments with Github actions. The app itself just has a single api to echo it's current git commit. As far as the Github Actions setup, it is a fairly representative pipeline that does:

- a quick unit test to check correctness
- builds a docker image (using the docker/setup-metadata action for tagging).
- takes the sha tag from the deployed image and applies it to our example Plural service

Here's a link to the example [code](https://github.com/pluralsh/plrl-cd-demo). The README there is pretty thorough and worth diving, but we can give the tldr here.

This model allows you to let your CI system what it does best, test code and build deployable artifacts, and then allow our CD solution to handle the longer duration and security-intensive task of deployment from there.

## Kubernetes Manifest setup

The manifests for the service are defined at `/kubernetes`. It's a fairly simple service with a `Deployment`, which runs 2 replicas of the api server, a `Service` which sets up internal network access to the server pods, and an `Ingress`, which sets up external load balancing to that service and also configures dns + tls certificates through integration with external-dns and cert-manager. There is also templating built-in to allow the service to be parameterized by `hostname` and by `tag`. These are stored as service secrets.

## Actions Setup

The action is defined at `.github/workflows/push.yaml`. The final step of the workflow calls the `plural cd services update` command that rewires the service to use the current sha. The command in longform is:

```sh
plural cd services update @{cluster-handle}/{service-name} --conf {name}={value} --conf {name2}={value2} ...
```

Feel free to run `plural cd services update --help` for more documentation as well.

## Self-Hosted Runners

Many users will want to host their console in a private network. If that's the case, a standard hosted Github Actions runner will not be able to network to the console api and allow the execution of the `plural cd` commands. The solution for this is to leverage github's self-hosted runners to allow you to run the Actions in an adjacent network and maintain the security posture of your console. We've added a few add-ons to make this setup trivially easy to handle, you'll want to:

- install the `github-actions-controller` runner to set up the k8s operator that manages runners in a cluster. You likely want this to be installed in your management cluster for network adjacency.
- install the `plrl-github-actions-runner` in that same cluster to create a runner set you can schedule jobs on.

Once both are deployed, you can create your first job, it'll likely look something like this:

```yaml
jobs:
  # some previous jobs...
  update-service:
    needs: [docker-build]
    runs-on: plrl-github-actions-runner
    env:
      PLURAL_CONSOLE_TOKEN: ${{ secrets.PLURAL_CONSOLE_TOKEN }}
      PLURAL_CONSOLE_URL: ${{ secrets.PLURAL_CONSOLE_URL }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: installing plural
        uses: pluralsh/setup-plural@v0.2.0
      - name: Using short sha
        run: echo ${GITHUB_SHA::7}
      - name: Update service
        run: plural cd services update @mgmt/marketing --conf tag=sha-${GITHUB_SHA::7}
```

Note that the `runs-on` job attribute is what specifies this as using the plrl-github-actions runner. It's worth also looking into some of the control mechanisms Github provides to gate what repositories and workflows can leverage self-hosted runners to manage the security tradeoffs it poses.

{% callout severity="warning" %}
Github recommends you don't use self-hosted runners on public repositories due to the complexity required to prevent workflows from being run by fork repository pull requests.
{% /callout %}

## Addendum

Since the plural cli is a standalone go binary, it can easily be injected in any CI framework in much the same way by installing it and the executing the appropriate cli command to modify your service once a deployable artifact has been built.
