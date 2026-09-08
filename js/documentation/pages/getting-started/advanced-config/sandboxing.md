---
title: Sandboxing your cluster
description: Deploy an instance with no outbound network dependencies to Plural
---

# Background

By default there are two ways your Plural Console will communicate with Plural:

- An HTTP call to confirm feature entitlements against your current subscription
- OIDC handshake if you have configured our OIDC provider

Both of these can be disabled individually or collectively. You might still have other things making outbound network requests, in particular, we ship with two repos pre-configured:

- https://github.com/pluralsh/deployment-operator
- https://github.com/pluralsh/scaffolds

The former is much more important as it hosts upgrades to our deployment agent (although it won't break anything if not pullable due to proxy configuration).

Also our deprecation and compatibility tracking ultimately source their data from the https://github.com/pluralsh/console repo.

## TLDR

You should read below to get a feel for what these configuration fields all mean, but a near-working setup of our chart for all these settings is given below (with the expectation of you plugging in your install-specific values).  These should be overlayed on the values that the plural cli generates by default:

```yaml
console:
  config:
    airgap: true # if you cannot allow egress
    agentHelmValues:
      image:
        repository: your.enterprise.registry/pluralsh/deployment-operator

      # configure agentk (if this isn't pullable kubernetes dashboarding functionality will break but deployments can still proceed)
      agentk:
        image:
          repository: your.enterprise.registry/pluralsh/agentk
  customOidc:
    enabled: true # if you want to bring your own OIDC provider
    clientId: some-client-id
    clientSecret: some-client-secret
    discoveryUrl: https://{your-idp-domain}/.well-known/openid-configuration

extraSecretEnv:
  CONSOLE_LICENSE_KEY: your-license-key # if you're using an airgapped license.
  CONSOLE_ADMIN_EMAILS: someone@example.com # if you want to auto-configure some emails as admins 

# If you need to disable built-in ingress tls
# main plural ingress
# ingress:
#   tls:
#     enabled: false

# # disable for KAS ingress too
# kas:
#   ingress:
#     tls:
#       enabled: false

global:
  registry: your.enterprise.registry

# configure kas image for the kubernetes proxy server setup
kas:
  agent:
    proxy:
      image:
        repository: your.enteprise.registry/some/nginx

  image:
    repository: your.enterprise.registry/pluralsh/kas

  redis:
    registry: your.enterprise.registry
    repository: redis

# if you need to enable the internal git server
gitServer:
  enabled: true # if you want to enable the built-in git server for our default repos, especially for sourcing the deployment operator
  repository: your.enterprise.registry/git-server
```

The exact images you'll want to vendor are listed below as well.

## Sandboxed Licensing

As part of an enterprise agreement, we can issue you a year-long license key that can then be configured into your console instance via setting the `CONSOLE_LICENSE_KEY` env var. We are happy to help configure that as part of setting up your instance as well.

## Bring-Your-Own-OIDC

For companies that are more comfortable using their own auth provider, and don't require the ease of use of just plugging in ours, you can configure your own. If you don't have an OIDC compatible identity provider, we recommend installing [dex](https://dexidp.io/docs/getting-started/) as a passthrough. It can communicate with SAML or other auth providers and convert them to a conformant OIDC interface.

OIDC providers require you to configure a redirect url, which for the Plural console will simply be: `https://{your-console-fqdn}/oauth/callback`.

To set it up, you need to configure a few env vars as well, in particular:

- `OIDC_CLIENT_ID`: client id for your oidc connection
- `OIDC_CLIENT_SECRET`: client secret for your oidc connection
- `OIDC_DISCOVERY_URL`: the discovery url for your oidc provider, is usually something like `https://{your-idp-domain}/.well-known/openid-configuration`
- `OIDC_SCOPES` (optional): the scopes to fetch when issuing the oidc userinfo request (defaults to `openid email`). You want to at least make sure the email is fetchable for a user, and if you add groups to the scopes we'll auto-sync them into your instance as well.

To simplify permission management, you can also configure specific emails to automatically be made admins via another env var: `CONSOLE_ADMIN_EMAILS`. It should be a comma seperated list, and on login we'll provision that user to be an admin w/in your Plural console instance. We'd recommend only setting this for a small set of users, then using group bindings for permissions from then on

## Fallback To Password Auth

The best practice for configuring auth in an enterprise environment is to use OIDC-based SSO described above. Sometimes in POC usecases, or similar scenarios, it's easier to use standard username/password auth.  This can be done by disabling oidc entirely, which requires two things:

1. Don't set the `OIDC_CLIENT_ID` env var
2. ensure `secrets.plural_client_id` is also not in the helm values or is empty (this is what handles using the "log in with plural" experience that is our default).

You usually should only need this if SSO access is logistically hard + you have an egress proxy that prevents usage of "Login With Plural".

## Sandboxed Compatibility Tables

We also bundle the compatibility and deprecation data in our docker images, and you can disable live polling github by setting the env var:

```
CONSOLE_AIRGAP: "true"
```

This is a suitable replacement if you're ok with some data staleness and don't have a feasible alternative to vendor the data into your enterprise git source control nor can permit the github egress traffic.

## Customizing Docker Registries

Lots of enterprises have strict requirements around the docker registries they use, or pull caches that whitelist a limited set of registries. The important images for setting up your own instance are:

Plural maintained images:

```
Management Cluster:
- ghcr.io/pluralsh/console
- ghcr.io/pluralsh/kas
- ghcr.io/pluralsh/deployment-controller
- ghcr.io/pluralsh/git-server (optional if you want to use our vendored git server)
```

```
Agent:
- ghcr.io/pluralsh/agentk
- ghcr.io/pluralsh/deployment-operator
```

```
Third party images used by our chart (these are often already vendored in an enterprise environment):
- ghcr.io/pluralsh/registry/bitnami/redis:7.4.2-debian-12-r5
- ghcr.io/pluralsh/registry/nginx:stable-alpine3.20-slim (can be any nginx image, ours is not customized)
- docker.io/kubernetesui/dashboard-api - this is also available via `ghcr.io/pluralsh/registry/kubernetesui/dashboard-api`
```

If you want to deterministically extract the images from our charts, you can also just use yq, like so:

```sh
git clone https://github.com/pluralsh/console.git
cd console
helm template charts/console | yq '..|.image? | select(.)' | sort -u

git clone https://github.com/pluralsh/deployment-operator.git
cd deployment-operator
helm template charts/console | yq '..|.image? | select(.)' | sort -u
```

If you plan to utilize Stacks, Sentinels or our async coding agent harness, there are a few other images that are utilized by our deployment-operator:

```
- ghcr.io/pluralsh/harness
- ghcr.io/pluralsh/sentinel-harness
- ghcr.io/pluralsh/agent-harness
```

You can see them all [here](https://github.com/orgs/pluralsh/packages?repo_name=deployment-operator).

The product experience of all these allow bring-your-own image, but if you configure a pull-through cache for these images or vendor them consistently, you can have Plural auto-wire it against an internal registry with the following CRD:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: AgentConfiguration
metadata:
  name: default
spec:
  baseRegistryURL: your.enterprise.registry
```

See more about this resource in the [AgentConfiguration](/plural-features/continuous-deployment/deployment-operator/agent-configuration) guide.

{% callout severity="info" %}
All of these images follow semver, and are also published to `gcr.io` and `docker.io` as well for convenience, in the event that either of those are eligible for internal pull-through caches.  The redis instance is not meaningfully customized and any bitnami or equivalent redis container image can theoretically work there.
{% /callout %}

## Docker Repository Overrides for Your management cluster

For the main Plural helm chart (https://pluralsh.github.io/console), configuring your *management cluster*, you'll want to use the following yaml overlay:

```yaml
# configure main console image
global:
  registry: your.enterprise.registry

# configure kas image
kas:
  agent:
    proxy:
      image:
        repository: your.enteprise.registry/some/nginx

  image:
    repository: your.enterprise.registry/pluralsh/kas

  redis:
    registry: your.enterprise.registry
    repository: redis

# if you need to enable the internal git server
gitServer:
  repository: your.enterprise.registry/git-server

dashboard:
  api:
    image:
      repository: your.enterprise.registry/kubernetesui/dashboard
```

Agent helm configuration is covered in a few sections below.

For more advanced configuration, we definitely recommend consulting the charts directly, they're both open source at https://github.com/pluralsh/console and https://github.com/pluralsh/deployment-operator.


### Self-Host Git Repos (management cluster)

If your enterprise cannot accept external communication to github, we can provide a fully self-hosted git server built with [soft-serve](https://github.com/charmbracelet/soft-serve) with the required Plural repos pre-cloned at a compatible version for your instance of the console.  This can be easily enabled via helm with the following values:

```yaml
extraEnv:
- name: CONSOLE_DEPLOY_OPERATOR_URL
  value: http://git-server.plrl-console:23232/deployment-operator.git # uses the git server for deployment operator updates
- name: CONSOLE_ARITIFACTS_URL
  value: http://git-server.plrl-console:23232/scaffolds.git # uses the git server for our default service catalog setup artifacts
gitServer:
  enabled: true
```

We publish a new version of this every release so you will simply need to ensure it's vendored and ready to pull on each helm upgrade.  Many organizations have a natural way to vendor docker images, and since this is deployed as a fully self-contained container image, you can simply repurpose that process to managing the necessary git repositories as well.

If you want to vendor the repositories entirely, the upstream repos are here:

- https://github.com/pluralsh/deployment-operator
- https://github.com/pluralsh/scaffolds

### Disable cert-manager based TLS (management cluster)

Our chart defaults to including TLS reconciled by cert-manager, but if you use a cloud-integrated cert management tool like Amazon Certificate Manager, it is unnecessary and could cause double-encryption.  Disabling is a simple values override, done with:

```yaml
# main plural ingress
ingress:
  tls:
    enabled: false

# disable for KAS ingress too
kas:
  ingress:
    tls:
      enabled: false
```

## Configuring Agent Helm Values (Workload Clusters)

Agent configuration must to be handled specially since they need to be configured in bulk. We provide a number of utilities to make reconfiguration scalable.

First, you'll first want to use our agent settings to configure your helm updates for agents globally, done at `{your-console-fqdn}/cd/settings/agents`. You should see a screen like the following that allows you to edit the helm values for agent charts managed through Plural:

![](/assets/deployments/agent-update.png)

This is the yaml blob that is most relevant:

```yaml
# configure main agent
image:
  repository: your.enterprise.registry/pluralsh/deployment-operator

# configure agentk (if this isn't pullable kubernetes dashboarding functionality will break but deployments can still proceed)
agentk:
  image:
    repository: your.enterprise.registry/pluralsh/agentk
```

This can also be set via CRD using:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: DeploymentSettings
metadata:
  name: global # this is a singleton resource that is always at this location
  namespace: plrl-deploy-operator
spec:
  agentHelmValues: # from values above
    image:
      repository: your.enterprise.registry/pluralsh/deployment-operator

    # configure agentk (if this isn't pullable kubernetes dashboarding functionality will break but deployments can still proceed)
    agentk:
      image:
        repository: your.enterprise.registry/pluralsh/agentk
```

From there, both our CLI and terraform provider will ensure these helm values are always applied either in a direct agent install with:

```bash
plural cd clusters bootstrap --name my-new-cluster
```

or via terraform with:

```tf
resource "plural_cluster" "my-cluster" {
    handle   = "my-cluster"
    name     = "my-cluster"
    
    tags = {
      tier = "dev"
      fleet = "my-fleet"
    }

    kubeconfig = { ... }

}
```