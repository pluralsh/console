---
title: Helm-sourced services
description: Source manifests from a Helm repository registered anywhere
---

You can also source manifests from an HTTPS or OCI-compatible Helm repository. This is very useful for provisioning
Kubernetes add-ons, which are usually packaged using Helm, or occasionally for complex release processes where Helm's
versioning independent of Git can be valuable. 

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

The same `values` / `valuesFiles` overlay is available from a sandboxed Python script. The sandbox has no environment or network access.

Python has the same filesystem access as Lua. The service root is mounted read-only at `/repo`, which is also the working directory, and the `fs.read` and `fs.walk` helpers mirror Lua's `fs` module. Standard Python file APIs (`open`, `pathlib`, and `os`) work on the same view. Writes, and paths that resolve outside the service root, raise `PermissionError`. Unlike Lua, which returns `nil` and an error message, the Python helpers raise exceptions such as `FileNotFoundError`.

The agent defines these builtins before your script runs. They are plain globals, so call them without an `import`:

| Name | Description |
|------|-------------|
| `values` | Output `dict`, starts empty. Keys you set are merged into the Helm values |
| `valuesFiles` | Output `list[str]`, starts empty. Extra values files to load, relative to the service root |
| `configuration`, `cluster`, `contexts`, `imports`, `service` | Read-only service context, the same bindings available to Lua and Liquid |
| `fs.read(path)` | Read a file from the service root as text. Mirrors Lua's `fs.read` |
| `fs.walk(dir, ignore_dotfiles=False)` | List the files under a directory, relative to the service root. Mirrors Lua's `fs.walk` |
| `yaml_encode(value)` / `yaml_decode(text)` | Serialize and parse YAML. Mirror Lua's `encoding.yamlEncode` and `encoding.yamlDecode` |
| `merge(destination, source, strategy="override")` | Deep-merge two dictionaries. Mirrors Lua's `utils.merge` |
| `k8s_object_meta(group, version, kind, namespace, name)` | Read cached Kubernetes object metadata (uid, name, namespace, and labels) from the agent. Cluster-scoped objects use an empty namespace, and a cache miss returns `None` |
| `warn(message)` | Report a non-fatal problem back to the service. See [Reporting Warnings](#reporting-warnings) |

```python
config = yaml_decode(fs.read("config/app.yaml"))
values["app"] = {"logLevel": config.get("logLevel", "info")}

dashboards = {}
for path in fs.walk("dashboards", ignore_dotfiles=True):
    if path.endswith(".json"):
        dashboards[path.split("/")[-1]] = fs.read(path)
values["grafana"] = {"dashboards": dashboards}
```

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

Python can also be loaded from a file with `pythonFile`, or from a folder of helper modules with `pythonFolder`. Lua and Python are mutually exclusive: when any Python field is set, Python runs and Lua is skipped. For the full builtin and filesystem reference, the supported language subset, available modules, script concatenation order, and value merge order, see [Dynamic Helm Configuration with Python Scripts](python.md).

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

Say you want to source the Helm templates from an upstream Helm repository, but the values files from a Git repository. In that case, you can define a multi-sourced service, which has both a Git and a Helm repository defined. It would look like this:

For more advanced compositions—such as deploying an operator from Helm alongside custom resources from Git using explicit `sources` and `renderers`—see [Multi-source services](multi-source-services.md).

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: GitRepository
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

It's also quite common for users to store Helm charts in Git repos. In that case, create a standard Git service pointing to that folder; our agent will auto-detect that it's a Helm chart, use Helm to template the manifests, and then apply them. You're also free to add additional values overrides like any other chart, or customize the `release` name of the Helm install.  Here's an example:

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