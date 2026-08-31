---
title: Helm-sourced services
description: Source manifests from a helm repository registered anywhere
---

You can also source manifests from a https or OCI-compatible helm repository. This is very useful for provisioning
kubernetes add-ons, which are usually packaged using helm, or occasionally for complex release processes where Helm's
versioning independent of git can be valuable. 

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: nginx
  namespace: infra
spec:
  namespace: ingress-nginx
  name: ingress-nginx
  cluster: k3s
  helm:
    version: 4.4.x
    chart: ingress-nginx
    url: https://kubernetes.github.io/ingress-nginx
    values:
      # in-line helm values, will be stored encrypted at rest
      controller:
        image:
          digest: null
          digestChroot: null
        admissionWebhooks:
          enabled: false
```

## Dynamic Helm Configuration via luaScript

Plural supports runtime configuration generation via Lua scripting. This feature allows Helm deployments to
dynamically compute `values` and `valuesFiles`, enabling powerful CI/CD workflows and context-aware configuration.

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: nginx
  namespace: infra
spec:
  namespace: ingress-nginx
  name: ingress-nginx
  cluster: k3s
  helm:
    version: 4.4.x
    chart: ingress-nginx
    url: https://kubernetes.github.io/ingress-nginx
    luaScript: |
      -- Lua code returning:
      -- { values: table<string, any>, valuesFiles: list<string> }
      values = {}
      values["appName"] = "MyApplication"
      values["version"] = "1.2.3"
      values["debug"] = true
      values["maxConnections"] = 100

      valuesFiles = {"config.json", "secrets.yaml"}
```
For more information, see [Dynamic Helm Configuration with Lua Scripts](lua.md).

## Multi-Source Helm

Say you want to source the helm templates from an upstream helm repository, but the values files from a Git repository.  In that case, you can define a multi-sourced service, which has both a git and helm repository defined.  It would look like so:

For more advanced compositions—such as deploying an operator from Helm alongside custom resources from Git using explicit `sources` and `renderers`—see [Multi-source services](multi-source-services.md).

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: GitReposiotry
metadata:
  name: infra
  namespace: infra
spec:
  url: https://github.com/pluralsh/my-infra-repo.git # replace w/ your own repo
---
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: nginx
  namespace: infra
spec:
  namespace: ingress-nginx
  name: ingress-nginx
  cluster: k3s
  git: 
    url: git@github.com:pluralsh/infra-example.git
    ref: main
    folder: helm # where helm values files are stored
  helm:
    version: 4.4.x
    chart: ingress-nginx
    url: https://kubernetes.github.io/ingress-nginx
    values:
      # in-line helm values, will be stored encrypted at rest
      controller:
        image:
          digest: null
          digestChroot: null
        admissionWebhooks:
          enabled: false
    valuesFiles:
    - ingress-nginx.values.yaml # using helm/ingress-nginx.values.yaml as our values file
```

## Helm Repositories Stored in Git

It's also quite common for users to store helm charts in Git repos.  In that case, you simply create a standard git service pointing to that folder and our agent will auto-detect it's a helm chart, and use helm to template the manifests then apply.  You're also free to add additional values overrides like any other chart, or customize the `release` name of the helm install.  Here's an example:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: helm-app
  namespace: infra
spec:
  namespace: helm-app
  name: helm-app
  cluster: k3s
  git: 
    url: git@github.com:pluralsh/infra-example.git
    ref: main
    folder: chart # where the helm chart lives
  helm:
    values:
      image:
        tag: override-tag # example in-line helm values
```