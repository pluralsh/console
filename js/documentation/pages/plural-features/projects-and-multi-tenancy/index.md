---
title: Projects and multi-tenancy
description: Handling enterprise-grade complexity with Plural projects
---
## Overview

One of the key challenges for implementing fleet management throughout an enterprise is balancing the competing concerns of gaining single-pane-of-glass management over your Kubernetes estate across multiple organizations or lines of business, and adhering to principals of least privilege and other security best practices that can easily be thrown by the wayside in implementing that degree of automation. In particular, these main concerns need to be satisfied to confidently implement fleet management:

1. Owners of a subset of resources cannot edit resources outside their domain
2. There is no single-store of credentials for the entire fleet (if one cluster is compromised that doesn't imply the entire enterprise is then compromised)
3. It is still seamless to create, destroy, and update any cluster within the fleet and maintain line-of-sight into what's running within them.

Plural allows you to maintain all three of these core concerns using a number of clever constructs, namely `Projects` (for segmenting resources w/in Plural under specific sets of bound policies), `NamespaceCredentials` for overriding the resources reconciled by our operator to specific configured credentials (making sure GitOps doesn't become implicit God-mode), and `ServiceAccount` which allows you to quickly provision assumable bot-accounts like Kubernetes service accounts which can then be fed into Terraform Stacks or `NamespaceCredentials` to seamlessly bound permissions throughout the system.

## TLDR

If you would rather just see a live demo, feel free to browse the video below, it will go over this in the context of a working example in full detail:

{% embed url="https://youtu.be/svGZ1-8fqKo" aspectRatio="16 / 9" /%}

## Setup 

The core of how tenancy is managed at scale is via Projects.  An example of how this can be set up is below:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: gke-fleet # this will be the namespace all Plural CRDS for `gke-fleet` live in for your management cluster
---
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceAccount
metadata:
  name: gke-fleet
spec:
  email: gke-fleet-fleet@plural.sh # the Plural service account user that will be admin for that Project
  tokenSecretRef:
    name: gke-fleet-sa-token # a secret that its access token will be dumped to
    namespace: gke-fleet
---
apiVersion: deployments.plural.sh/v1alpha1
kind: Project
metadata:
  name: gke-fleet
spec:
  name: gke-fleet
  description: resources for managing the gke-fleet fleet
  bindings:
    write:
    - userEmail: gke-fleet-fleet@plural.sh # adds the user as a writer for the project (by email)
---
apiVersion: deployments.plural.sh/v1alpha1
kind: NamespaceCredentials
metadata:
  name: gke-fleet
spec:
  namespaces:
  - gke-fleet # the namespace we want gke-fleet crs to live in
  secretRef:
    name: gke-fleet-sa-token # the token the operator will use in that namespace, ensuring permissions are only scoped to the project
    namespace: gke-fleet
```

This creates a `ServiceAccount` for the dummy `gke-fleet-fleet@plural.sh` email and plumbs that service account as the writer for the `gke-fleet` Project.  Finally it binds that service account's access token as the credentials for the `gke-fleet` namespace.

From there, we can create a single service to sync in resources w/in that namespace like so:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: gke-fleet
spec:
  namespace: gke-fleet
  git:
    folder: fleets/gke-fleet
    ref: main
  repositoryRef:
    kind: GitRepository
    name: fleet
    namespace: fleets
  clusterRef:
    kind: Cluster
    name: mgmt
    namespace: infra
```

And add a few clusters also like so w/in that namespace:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: InfrastructureStack
metadata:
  name: gke-fleet-cluster-dev
spec:
  name: gke-fleet-cluster-dev
  type: TERRAFORM
  approval: true
  detach: false
  manageState: true
  actor: gke-fleet-fleet@plural.sh
  projectRef:
    name: gke-fleet
  configuration:
    version: 1.8.2
  repositoryRef:
    name: fleet
    namespace: fleets
  clusterRef:
    name: gke-fleet-tf
    namespace: fleets
  git:
    ref: main
    folder: terraform/gke-cluster
  environment:
  - name: TF_VAR_cluster
    value: gke-fleet-dev
  - name: TF_VAR_tier
    value: dev
  - name: TF_VAR_fleet
    value: gke-fleet
  jobSpec:
    serviceAccount: stacks
    namespace: plrl-deploy-operator
---
apiVersion: deployments.plural.sh/v1alpha1
kind: Cluster
metadata:
  name: gke-fleet-dev
spec:
  handle: gke-fleet-dev
  tags:
    tier: dev
    fleet: gke-fleet
```

Since the `InfrastructureStack` resource was created in that namespace, it's going to use the above `ServiceAccount`'s credentials to reconcile that CRD.  It also has bound the service account as the actor for the stack, so any usage of the Plural terraform provider will auth as that service account.  Note there are guarantees within Plural's authorization logic to ensure these are only w/in resources that user can write to and that they can't wire in other actor's besides themselves if they don't have sufficient permissions.

Notice we're also using a dedicated cluster, `gke-fleet-tf` to execute that terraform stack.  This allows you to separate the cloud creds used for provisioning your cloud infrastructure and reduce the risk of a single management cluster with God-like access to your cloud estate.  And you can bind those clusters to Projects as well to ensure they're only accessible to the right individuals within your enterprise within Plural itself.

Now that the clusters are set, you can also add a few services, like:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: kube-state-metrics-dev
spec:
  name: kube-state-metrics
  namespace: kube-state-metrics
  helm:
    chart: kube-state-metrics
    version: 5.19.0 # VERSION
    repository:
      name: prometheus
      namespace: infra
  clusterRef:
    kind: Cluster
    name: gke-fleet-dev
    namespace: gke-fleet
---
apiVersion: deployments.plural.sh/v1alpha1
kind: GlobalService
metadata:
  name: kube-state-metrics-dev-gke-fleet
spec:
  cascade:
    delete: true
  serviceRef:
    name: kube-state-metrics-dev
    namespace: gke-fleet
  projectRef:
    name: gke-fleet
  tags:
    tier: dev
```

Again, these services are only creatable w/in clusters of the `gke-fleet` project, since they're in a namespace bound to that `ServiceAccount`'s credentials.

## What Does This Do for Me?

So what's the upshot here:

* We've been able to scalably manage permissions throughout your clusters using the `Project` abstraction.
* We've been able to isolate the GitOps reconciliation process to limited and scoped permissions using the `NamespaceCredentials` object, and bind them to users w/ only write access to a single `Project`
* We've leveraged the cluster targeting feature of Stacks to scope down the cloud creds used by terraform to the single project it's relevant for.
* We've still maintained Plural as a single point to manage the entirety of your Kubernetes estate in a scalable, but compliant, way.
