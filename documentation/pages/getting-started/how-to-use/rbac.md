---
title: Add RBAC to the K8s dashboard
description: Use a simple global service to configure organization wide Kubernetes RBAC for end users
---

# Overview

By default, the Plural Console embedded Kubernetes dashboard ships with closed permissions.  You'll need to gradually add [RBAC](https://kubernetes.io/docs/reference/access-authn-authz/rbac/) rules to users or groups as you want to carefully expand access throughout the system.

In addition, Plural's built-in Continuous Deployment engine allows you to ship these rules seamlessly to all clusters in your fleet, or to any subset of clusters.  We'll show you how to set up a basic cluster-admin role for SRE personnel on your team, but the basics can be reworked for any other set of RBAC rules

## Define an RBAC service

We'll make a simple folder of RBAC rules under `services/rbac` in your repo.  To start, let's define a rule for the `sre` group like so, under `services/rbac/sre.yaml`:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: sre-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - apiGroup: rbac.authorization.k8s.io
    kind: Group
    name: sre
```

This role references the `sre` group in the Plural Console, which you can also configure to sync with your upstream identity provider or SSO.  For the purposes of the walkthrough, you can also manually create that group by navigating to Settings > User Management > Groups or going to https://{you-console-instance}/settings/user-management/groups

{% callout severity="info" %}
Plural uses a Kubernetes concept called [Impersonation](https://kubernetes.io/docs/reference/access-authn-authz/authentication/#user-impersonation) to authenticate into an end cluster's API server with an identity that looks exactly like the current users' Plural Console identity.  The primary benefit of this is it allows you to mirror your SSO straight into kubernetes itself, rather than deal with cloud-specific authorization complexity.
{% /callout %}

If you want to add other rules, say for a specific user, feel free to add them in that folder as well, eg you could add a rule `services/rbac/michael.yaml`:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: sre-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - apiGroup: rbac.authorization.k8s.io
    kind: User
    name: michael@example.com
```

To add the specific user `michael@example.com` identified by that email to the RBAC rules.

## Define a GlobalService to sync the rbac fleet-wide

We'll define our first, extremely basic global service to sync these rbac rules like so, under `bootstrap/components/rbac.yaml`:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: GlobalService
metadata:
  name: rbac
  namespace: infra
spec:
  template:
    name: rbac
    namespace: rbac
    git:
      ref: main
      folder: services/rbac
    repositoryRef:
      kind: GitRepository
      name: infra # this should point to your `plural up` repo, and is referencing a GitRepository CRD at `bootstrap/setup.yaml`
      namespace: infra
```

## Push to Deploy

We registered all these manifests under the root `bootstrap` folder a `plural up`-derived management cluster listens to by default, so all you should need to do is either:

```sh
git commit -m "setup example microservice"
git push
```

or create a PR, approve it, and merge to have this new service deploy.  

{% callout severity="info" %}
You might need to wait a minute or two for the system to poll git and realize there's a new change.
{% /callout %}

## Check the Kubernetes Dashboard

It should only take a quick poll cycle to see the resources populate in your dashboard at https://{your-console}/kubernetes.  If you don't see anything there, it's likely you simply haven't created the `sre` group or haven't added your own user to it.  Doing that manually giving it a second to repopulate should do the trick.