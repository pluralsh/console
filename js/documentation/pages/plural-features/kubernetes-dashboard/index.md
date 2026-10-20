---
title: Kubernetes dashboard
description: Configure access to the embedded Kubernetes Dashboard
---
## Introduction

Your Plural console comes with a fully embedded Kubernetes dashboard.  This is meant to solve for a few things:

* Simplifying Kubernetes API access:  No need to juggle kubeconfigs, VPNs, etc. to understand your Kubernetes clusters.  It also connects directly to your OIDC provider, so it uses an approved auth flow.
* Simplifying networking: all traffic to managed clusters uses the same unidirectional egress networking from the Plural agent as deployments do.  That way you can retain visibility into private and on-prem clusters.
* Better UI: you'll get all the benefits of Plural's UI/UX in your Kubernetes dashboard experience.

## RBAC

The dashboard uses [Kubernetes Impersonation](https://kubernetes.io/docs/reference/access-authn-authz/authentication/#user-impersonation) to authenticate to Kubernetes using your Console identity.  That means all RBAC resolves to your Console user email and groups, which are themselves connected to your identity provider.  On net, this should give you an effective Kubernetes SSO experience.

To create RBAC rules for your Console user, you'd use something like:

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

This grants the `cluster-admin` role to all users within the `sre` group.  Alternatively:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: someones-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - apiGroup: rbac.authorization.k8s.io
    kind: User
    name: someone@your.company.com
```

This grants the same role only to the `someone@your.company.com` user email.

We recommend placing your fleet-wide RBAC policy into a single folder, e.g. `rbac`, and then making a global service to sync it everywhere, like:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: GlobalService
metadata:
  name: rbac
spec:
  template:
    namespace: plrl-rbac
    git:
      folder: rbac
      ref: main
    repositoryRef:
      kind: GitRepository
      name: infra # should point to a CRD that references the repo you're working in
      namespace: infra
```

but you're free to organize your RBAC rules however your organization wishes, as long as they're configured in the destination cluster you'd like to manage.
