---
title: Git-sourced services
description: Source manifests directly from git
---

The simplest service you can deploy is just referencing a folder within a git repository. This pattern is great for deploying a simple microservice owned by a dev team, or perhaps setting up an app-of-apps. 

There are a few different ways this can be done, here is the simplest:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: git-folder
spec:
  namespace: examples
  name: git-folder
  cluster: k3s # handle of the git repository
  git:
    url: git@github.com:your-org/example.git # this git repository needs to be created either via a GitRepository cr or in the Plural UI
    folder: kubernetes/manifests # or whatever folder you wish
    ref: main
```

You can also use custom resource references if you don't want to type out the git repository url each time (this can also be useful to provide a stable name for that repository). The CRs needed to make this work would be:

```yaml
# the GitRepository and Cluster resources should ideally be defined elsewhere in your infra repo
apiVersion: deployments.plural.sh/v1alpha1
kind: GitRepository
metadata:
  name: example
  namespace: infra
spec:
  url: git@github.com:your-org/example.git
---
apiVersion: deployments.plural.sh/v1alpha1
kind: Cluster
metadata:
  name: k3s
  namespace: infra
spec:
  handle: k3s
---
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: git-folder
spec:
  namespace: examples
  name: git-folder
  git:
    folder: kubernetes/manifests # or whatever folder you wish
    ref: main
  repositoryRef:
    kind: GitRepository
    name: example
    namespace: infra
  clusterRef:
    kind: Cluster
    name: k3s
    namespace: infra
```

If the folder just contains a number of `ServiceDeployment` kind structures, you can create a full-blown service of services and provision a wide array of complex resource heirarchies
