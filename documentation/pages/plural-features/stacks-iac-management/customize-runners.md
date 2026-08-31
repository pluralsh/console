---
title: Customize stack runners
description: Configure runner pods to enable workload identity or EKS IRSA
---

All stacks are run in a dedicated pod to support seamless scalability and enhance security.  That said, you'll likely need to customize the definitions of those pods for a few usecases:

* Needing to add wiring to meet your existing OPA policy constraints around things like custom labels or `securityContext`
* Needing to configure the pod with service accounts preconfigured for IRSA, GKE workload identity or similar secure cloud credential issuance systems
* Needing to use your own base image

The process is simple and can be done per-stack or globally

## Configure the base image of your stack

All the stack runner images we provide are open source and available at https://github.com/pluralsh/deployment-operator.  You're free to extend them and add any additional tools you want in the environment.  Once that extended image is baked and published, you can reconfigure your stack CRD with:


```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: InfrastructureStack
metadata:
  name: gke-demo
  namespace: stacks
spec:
  name: gke-demo
  type: TERRAFORM
  ...
  configuration:
    image: your.registry/stack-harness
    tag: your-tag
```

## Configure Runner for a single stack

The `jobSpec` field with a stack spec can configure that stacks runner, like so:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: InfrastructureStack
metadata:
  name: gke-demo
  namespace: stacks
spec:
  name: gke-demo
  type: TERRAFORM
  approval: true
  detach: false
  manageState: true
  actor: console@plural.sh
  configuration:
    version: 1.8.2
  repositoryRef:
    name: fleet
    namespace: fleets
  clusterRef:
    name: mgmt
    namespace: infra
  workdir: gke-cluster
  git:
    ref: main
    folder: terraform
  # add a service account and label
  jobSpec:
    serviceAccount: stacks
    labels:
      deployment.plural.sh/needed-label: "finally-set"
```

The expectation being that the service account was preconfigured for IRSA like so:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: stacks
  namespace: plrl-deploy-operator
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::{your-account-id}:role/plrl-stacks
```

This will add a service account and labels to the pod, but you can configure more information up to a full k8s JobTemplateSpec object.  We encourage referencing our {% doclink to="plural_features_continuous_deployment_deployment_architecture" %}CRD docs{% /doclink %} if you want to learn all the knobs available.

## Configure Runner Pods Globally

You can also configure runners globally here:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: DeploymentSettings
metadata:
  name: global
spec:
  stacks:
    jobSpec:
      serviceAccount: stacks
      labels:
        deployment.plural.sh/needed-label: "finally-set"
```

Configuration at the stack-level will always take priority, and global configuration is used as the next fallback before finally our hardcoded defaults.