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

## Dynamic Helm Configuration via pythonScript

The same `values` / `valuesFiles` overlay is available from a sandboxed Python script. The sandbox does not expose OS, filesystem, or network access. The only host callback is `k8s_object_meta`, which reads cached Kubernetes object metadata (uid, name, namespace, and labels) from the agent. Cluster-scoped objects use an empty namespace. A cache miss returns `None`.

Scripts can also call `warn(message)` to report non-fatal problems back to the service. See [Reporting Warnings](#reporting-warnings).

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: observe
  namespace: infra
spec:
  namespace: observe
  name: observe
  cluster: k3s
  helm:
    version: 1.x.x
    chart: observe
    url: https://example.invalid/charts
    pythonScript: |
      ns = k8s_object_meta("", "v1", "Namespace", "", "kube-system")
      if ns:
          values["observeClusterId"] = ns["uid"]
          values["label"] = ns["labels"]["kubernetes.io/metadata.name"]
      else:
          warn("kube-system namespace not found in the agent cache, observeClusterId will not be set")
```

The Lua equivalent of `k8s_object_meta` is documented in [Dynamic Helm Configuration with Lua Scripts](lua.md#kubernetes-object-metadata).

## Reporting Warnings

Both Lua and Python scripts can call `warn(message)` to report non-fatal problems, such as a missing optional input that makes the script fall back to a default. Warnings are shown in the service errors in the Plural Console, but unlike errors they do not fail the deployment.

```python
region = configuration.get("region")
if not region:
    region = "us-east-1"
    warn("region configuration is not set, defaulting to us-east-1")
values["region"] = region
```

Keep in mind that:
- `warn` accepts a single string argument. Anything else raises an error (a `TypeError` in Python).
- A service with warnings is marked as `stale` instead of `healthy` until the script stops reporting them.
- Warnings are collected on every render, so keep messages deterministic, e.g. do not include timestamps.
- Empty and duplicate messages are dropped, and up to 20 warnings of at most 1 KB each are reported per render.

See [Service Warnings](lua.md#service-warnings) for the Lua reference.

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