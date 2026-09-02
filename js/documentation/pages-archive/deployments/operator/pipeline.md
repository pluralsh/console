---
title: Release Pipelines
description: CRD definition of full release pipelines
---

You can leverage the modular design of the plural operator to define a full pipeline referencing your service and cluster objects. Here's a basic example of what that would look like:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: upgrade-plan-dev
spec:
  namespace: upgrade-plan
  git:
    folder: test-apps/k3s
    ref: master
  repositoryRef:
    kind: GitRepository
    name: console
    namespace: infra
  clusterRef:
    kind: Cluster
    name: k3s-test
    namespace: infra
---
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: upgrade-plan-prod
spec:
  namespace: upgrade-plan
  name: upgrade-plan
  git:
    folder: test-apps/k3s
    ref: master
  repositoryRef:
    kind: GitRepository
    name: console
    namespace: infra
  clusterRef:
    kind: Cluster
    name: k3s-prod
    namespace: infra
---
apiVersion: deployments.plural.sh/v1alpha1
kind: Pipeline
metadata:
  name: k3s-upgrade
  namespace: infra
spec:
  stages:
    - name: dev
      services:
        - serviceRef:
            name: upgrade-plan
            namespace: upgrade-plan-dev
    - name: prod
      services:
        - serviceRef:
            name: upgrade-plan
            namespace: upgrade-plan-prod
          criteria:
            serviceRef:
              name: upgrade-plan
              namespace: upgrade-plan-dev
            secrets:
              - version
  edges:
    - from: dev
      to: prod
      gates:
        - name: approval-gate
          type: APPROVAL
```

Notice the pipeline has two main objects, the stage, and an edge. It defines a standard vertex/edge datastructure for a directed acyclic graph, with each edge allowing configuration of promotion gates, and each service within a stage having promotion criteria (which determines what source service you can promote git/helm configuration from and configuration fields as).

In this specific case, there are two k3s upgrade plan services (which control via CRDs in-place upgrades of k3s). A `version` secret defines the exact kubernetes version the system upgrade controller will currently use. Tying that into a pipeline allows for you to test the upgrade on the dev k3s cluster, then promote and perform the upgrade on the prod one.
