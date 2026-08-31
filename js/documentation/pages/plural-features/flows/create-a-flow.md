---
title: Creating A Flow
description: Creating a flow and registering your services with it
---

# GitOps Configuration

Creating a flow is easy to do with our Kubernetes Operator, an example yaml spec is:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: Flow
metadata:
  name: console
spec:
  icon: https://console.boot-aws.onplural.sh/console-white.png # optional icon for internal branding
  description: The Plural Console itself
  bindings:
    read:
    - groupName: console-readers # these will link to your Active Directory or IdP via OIDC
    write:
    - groupName: console-writers 
```

From there, you can use the `flowRef` attribute on `ServiceDeployment` or `Pipeline` to register services or pipelines, eg:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: console
  namespace: infra
spec:
  namespace: plrl-console
  flowRef:
    name: console # references the flow CR we created above
  git:
    folder: helm-values
    ref: main
  repositoryRef:
    kind: GitRepository
    name: infra
    namespace: infra
  helm:
    version: "0.x.x"
    chart: console-rapid
    valuesFiles:
    - console.yaml
    repository:
      namespace: infra
      name: console
  clusterRef:
    kind: Cluster
    name: mgmt
    namespace: infra
```

and for a Pipeline, it'll end up looking like the following:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: Pipeline
metadata:
  name: console
spec:
  flowRef:
    name: console

  stages:
    - name: dev
      services:
        - serviceRef:
            name: console-dev
            namespace: console
          criteria:
            prAutomationRef:
              name: service-upgrade-pra
    - name: prod
      services:
        - serviceRef:
            name: console-prod
            namespace: console
          criteria:
            prAutomationRef:
              name: service-upgrade-pra
  edges:
  - from: dev
    to: prod
    gates:
    - name: approval-gate
      type: APPROVAL
```

Once this is applied (easily done by adding to a Git repository managed by Plural CD), you'll end up with a view in the Plural Console something like this:

![](/assets/flows/flow-ui.png)