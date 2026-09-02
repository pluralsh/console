---
title: Bring your own K8s cluster
description: Bootstrap Plural on an existing cluster
---

## Overview

For users that just want to use our CD capabilities and full control of their kubernetes setup, you can install a simplified version of Plural onto an existing kubernetes cluster. We've made this a turnkey process, but there are some prerequisites, namely:

- You'll need to create a postgres db for state storage, and have a jdbc connection string for it ready of the form: `postgres://<user>:<password>@<host>:5432/<db>`
- You'll need to have your network setup in place so that all clusters you want to deploy to can make outbound network connections to the ingress you configure for plural CD, in general this means setting up:

* ingress-nginx - the ingress controller we've configured by default in the chart
* cert-manager - the chart assumes cert-manager handles cert generation by default but this can be disabled as well if you use a load balancer bound cloud cert manager
* externaldns - to bind dns entries to the hosts defined in the console's ingress

You are free to customize these at your own risk, usually it's not that challenging. The most likely potential gotcha is ensuring the connection stickiness configuration handles a migration to a different ingress controller from ingress-nginx.

{% callout severity="info" %}
If you're unfamiliar with how to set up these components for your cloud, we have a number of useful example terraform setups at https://github.com/pluralsh/bootstrap/tree/main/existing.

It will walk you through effectively everything needed below
{% /callout %}


## Bootstrapping

Make sure your kubeconfig is pointing to the management cluster you want to deploy to, then run the following:

```sh
plural login
plural cd control-plane
```

If you haven't already installed the Plural CLI, we have a homebrew installation available here:

```sh
brew install pluralsh/plural/plural
```

If you don't have homebrew, there are more advanced installation instructions {% doclink to="getting_started_quickstart" %}here{% /doclink %}.

This will do a few things:

- ask you for basic configuration like fqdns for your CD install and also the postgres jdbc url
- set up a oidc provider for your cluster to provide secure user login
- print a full helm values file that will be used to install your instance.

You'll then want to run the helm command we provide to you, you have the option to inspect the values we've generated first, and also you can add some last mile configuration here. This can be things like flipping out the ingress class or cert manager issuer (we use `nginx` by default and an issuer of `letsencrypt-prod`).

Then run the helm commands generated, which ought to be something along the lines of:

```sh
helm repo add plrl-console https://pluralsh.github.io/console
helm upgrade --install --create-namespace -f values.secret.yaml console plrl-console/console -n plrl-console
```

We also strongly recommend you find a secure place to store the generated `values.secret.yaml` file in case you want to manually manage future console updates. You can use tooling like `git-crypt` or `kops` to secure this in git, or save it in a secret manager.

## Manage Console Via CRD

You can also define a CRD to manage your console's upgrade lifecycle at your own pace. This is a two step process:

1. Create a secret with your current values file, something like:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: console-values
  namespace: plrl-console
stringData:
  values.yaml: <your values file>
```

This should be done out of band of git as the values contain sensitive information. A single command to create this is also:

```sh
kubectl create secret generic console-values --from-file=values.yaml=values.secret.yaml -n infra
```

(you'll want to run this in the same directory as your `values.secret.yaml` file, otherwise specify it's relative path in the `--from-file` flag)

2. Create a helm service referencing it in a folder currently being synced via GitOps:

```yaml
---
apiVersion: deployments.plural.sh/v1alpha1
kind: Cluster
metadata:
  name: mgmt # you'd have likely defined this cluster CRD already, but provided here for completeness
  namespace: infra
spec:
  handle: mgmt
---
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: console
  namespace: infra
spec:
  namespace: plrl-console # this namespace must be correct
  name: console
  helm:
    version: 0.x.x # VERSION (will be used below, 0.x.x means we float minor and patch versions)
    chart: console
    url: https://pluralsh.github.io/console
    valuesFrom:
      namespace: infra
      name: console-values # maps to the secret we created above
  clusterRef:
    kind: Cluster
    name: mgmt # must be set to your management cluster
    namespace: infra
```

You can then add additional values configuration using the `values` field of a helm service, or convert it to a multi-source service and source values files directly from git.

## Generate Console Update PRs instead of floating versions

If you want to pin your console version and generate PRs instead of auto-updating, you can use the following Plural CRs to automate that entirely:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: PrAutomation
metadata:
  name: console-upgrader
spec:
  name: console-upgrader
  documentation: Updates the console service to a new helm version
  updates:
    regexReplacements:
    - regex: "version: (.*) # VERSION" # the VERSION comment is simply to assist regex replacement here
      file: bootstrap/console.yaml # rewrite to whatever the actual version of your console is
      replacement: "version: {{ context.version }} # VERSION"
  scmConnectionRef:
    name: workspaces
  title: "Update Plural Console helm chart to {{ context.version }}"
  message: |
    Update Plural Console helm chart to {{ context.version }}

    Release notes available here: https://github.com/pluralsh/console/releases
  identifier: ${YOUR_REPO_SLUG} # eg pluralsh/plrl-infra
  configuration:
  - name: version
    type: STRING
    documentation: version of the new helm chart
---
apiVersion: deployments.plural.sh/v1alpha1
kind: Observer
metadata:
  name: console
spec:
  crontab: "*/5 * * * *"
  initial: '0.3.81' # or whatever your current chart version is
  target:
    order: SEMVER
    type: HELM
    helm:
      url: https://pluralsh.github.io/console
      chart: console
  actions:
  - type: PR
    configuration:
      pr:
        prAutomationRef:
          name: console-upgrader # references the PrAutomation CR we created above
          namespace: infra
        context:
          version: $value
```