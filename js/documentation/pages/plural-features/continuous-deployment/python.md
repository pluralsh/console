---
title: Dynamic Helm Configuration with Python Scripts
description: Enhance Helm deployments with dynamic configuration by using sandboxed Python scripts
---

Helm services can compute `values` and `valuesFiles` at render time with a Python script, as an alternative to [Lua scripts](lua.md). Lua and Python are mutually exclusive: when any Python field is set, Python runs and Lua is skipped. The script mutates two pre-defined globals, and the deployment agent merges the result into the Helm release:

```json
{
  "values": {
    "key": "value"
  },
  "valuesFiles": ["file1.yaml", "file2.yaml"]
}
```

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: my-app
  namespace: infra
spec:
  namespace: my-app
  name: my-app
  cluster: k3s
  configuration:
    environment: prod
  helm:
    version: 1.x.x
    chart: my-app
    url: https://example.invalid/charts
    pythonScript: |
      env = configuration.get("environment", "dev")
      values["replicaCount"] = 3 if env == "prod" else 1
      valuesFiles.append(f"values-{env}.yaml")
```

## The Python Runtime

Scripts are executed by [Monty](https://github.com/pydantic/monty), a sandboxed Python interpreter written in Rust, embedded in the deployment agent through [gomonty](https://github.com/pluralsh/gomonty). It is not CPython: it implements a subset of Python 3.14 syntax and a subset of the standard library. Apart from a read-only view of the service's files, it has no access to the host system.

The agent currently bundles gomonty `v0.1.0`, which pins Monty `v1.4.0`. Monty's [upstream documentation](https://pydantic.dev/docs/monty/limitations/) tracks the latest Monty release, which may support more than the pinned version does. Treat this page as the reference for what works in the agent.

### Security Model

- **Read-only access to the service files**: the service root, the directory the agent unpacked the service tarball into, is mounted read-only at `/repo`, which is also the working directory. Scripts can read it with the [`fs` helpers](#reading-files), `open`, `pathlib`, and `os`. Writes raise `PermissionError`, as do paths that resolve outside `/repo`, including `..` and symlinks that point outside the service root. Nothing else on the agent's filesystem is visible.
- **No environment or network access**: `os.getenv` and `os.environ` raise `RuntimeError`, and there is no socket, HTTP, or subprocess module.
- **No third-party packages**: there is no `sys.path` or site-packages, so `import yaml`, `import requests`, and similar fail with `ModuleNotFoundError`. YAML support is provided by the [`yaml_encode` and `yaml_decode`](#yaml) globals instead.
- **Limited host callbacks**: the only way to reach the agent is [`k8s_object_meta`](#kubernetes-object-metadata), a read-only lookup against the agent's object cache. The [YAML](#yaml) and [`merge`](#merging-dictionaries) helpers also run on the agent, but they only transform the data you pass them. [`warn`](#service-warnings) and the [`fs` helpers](#reading-files) are defined in the sandbox itself.
- **Fresh state on every render**: each render gets a new interpreter. Nothing defined in one render, including functions and globals, is visible to the next.

### Resource Limits

| Limit | Value |
|-------|-------|
| Execution time | 10 seconds, including time spent waiting for a free interpreter |
| Memory | 100 MB for each interpreter in the agent's pool, shared by all scripts running at the same time |
| Recursion depth | 100 frames |

The memory limit covers everything the interpreters on the agent hold at once, so a script can use more than 100 MB while the agent is otherwise idle, and less when many services render together. Keep scripts well under 100 MB, and avoid reading large files whole.

Exceeding a limit fails the render with a `TimeoutError`, `MemoryError`, or `RecursionError`.

## Script Sources and Concatenation Order

Python code can come from three Helm fields:

| Field | Description |
|-------|-------------|
| `pythonScript` | Inline Python source |
| `pythonFile` | Path to a `.py` file, relative to the service root |
| `pythonFolder` | Path to a folder of `.py` files, relative to the service root |

The agent builds a single program from these fields before running it:

1. If `pythonScript` is set and non-empty, it is the main script and `pythonFile` is ignored. Otherwise `pythonFile` is the main script.
2. If `pythonFolder` is set, every file ending in `.py` under it, including subdirectories, is collected and sorted by relative path. Their contents are joined with blank lines.
3. The folder contents are placed **before** the main script, so the main script can call helpers defined in the folder.

All of this runs as one module, so a later file can use and overwrite names defined by an earlier one. Prefix file names with numbers (`00-helpers.py`, `10-database.py`) to make the order explicit.

```
python/
├── 00-helpers.py
├── 10-database.py
└── 20-ingress.py
```

Paths that resolve outside the service root, including symlinks, are rejected.

Line numbers in error messages refer to this combined program, not the individual file. With a folder in use, subtract the length of the earlier files to find the line in your own file.

## Globals

The agent defines the following globals before your code runs.

### Outputs

| Name | Type | Description |
|------|------|-------------|
| `values` | `dict` | Starts empty. Keys you set are merged into the Helm values |
| `valuesFiles` | `list[str]` | Starts empty. Paths, relative to the service root, of extra values files for the agent to load |

Mutate these in place (`values["key"] = ...`, `valuesFiles.append(...)`) or reassign them, as long as the final types are a `dict` and a list of strings. Anything else fails the render.

`values` is converted to JSON when the script finishes, so it may only contain `dict`, `list`, `tuple`, `str`, `int`, `float`, `bool`, and `None`:

- Tuples become lists, and non-string dictionary keys become strings.
- Sets are not serializable and fail the render. Convert them with `sorted(...)` or `list(...)` first.
- Integers above 2^53 lose precision. Pass large numbers as strings.

### Service Context

These are read-only snapshots of the service being rendered. They are the same bindings available to Lua scripts and Liquid templates.

| Name | Type | Contents |
|------|------|----------|
| `configuration` | `dict[str, str]` | The service's `configuration` key/value pairs |
| `cluster` | `dict` | The target cluster. Keys include `id`, `self`, `handle`, `name`, `version`, `currentVersion`, `kasUrl`, `distro`, `metadata`, `consoledns`, and `tags` (a `dict[str, str]`). Each key is also available in its capitalized form, such as `Handle`, `ID`, and `ConsoleDNS` |
| `contexts` | `dict[str, dict]` | Service contexts, keyed by context name |
| `imports` | `dict[str, dict[str, str]]` | Stack outputs from `imports`, keyed by stack name then output name |
| `service` | `dict` | The service's `name`, `namespace`, and `helm` settings |

Cluster fields that aren't set are `None`, so check for `None` before calling string methods on them.

```python
handle = cluster["handle"]
tier = cluster["tags"].get("tier", "standard")
db = imports.get("rds", {})

values["global"] = {"clusterName": handle, "tier": tier}
if "endpoint" in db:
    values["database"] = {"host": db["endpoint"]}
```

### Functions

| Name | Description |
|------|-------------|
| [`yaml_encode(value)`](#yaml) | Serialize a value to a YAML string |
| [`yaml_decode(text)`](#yaml) | Parse a YAML string into Python values |
| [`merge(destination, source, strategy="override")`](#merging-dictionaries) | Deep-merge two dictionaries |
| [`k8s_object_meta(group, version, kind, namespace, name)`](#kubernetes-object-metadata) | Look up cached Kubernetes object metadata |
| [`warn(message)`](#service-warnings) | Report a non-fatal warning to the service |
| [`fs.read(path)`](#reading-files) | Read a file from the service root as text |
| [`fs.walk(dir, ignore_dotfiles=False)`](#reading-files) | List the files under a directory of the service root |

These are plain globals, not modules, so call them directly without an `import`.

## Value Merge Order

Lua and Python values scripts are mutually exclusive. If any Python field is set (`pythonScript`, `pythonFile`, or `pythonFolder`), only Python runs. Otherwise Lua runs when configured. Their results are layered over the service's other value sources in this order, where later layers win:

1. The chart's own `values.yaml`
2. `values.yaml.liquid` at the service root, if present, after Liquid rendering
3. Each file in `helm.valuesFiles`, in order
4. Each file appended to `valuesFiles` by the active script (Lua or Python), in order
5. The inline `helm.values`
6. `values.yaml.static` at the service root, if present
7. The `values` dictionary produced by the active script

Each layer is deep-merged into the one below it:

- Nested dictionaries are merged key by key.
- Lists and scalars replace the previous value entirely. There is no list appending, so to add to a list from a lower layer, rebuild the full list in your script.
- A key set to `None` becomes YAML `null`, which Helm treats as a request to delete the chart's default for that key.

Scripts can't see values from the other layers. The `values` global always starts empty.

## Supported Python

### Language Features

Supported:

- Functions with `def`, default and keyword-only arguments, `*args` and `**kwargs`, nested functions, closures, `lambda`, `global`, and `nonlocal`
- `if` / `elif` / `else`, conditional expressions, `for` and `while` (including `else`, `break`, `continue`), `assert`, and `pass`
- `try` / `except` / `else` / `finally` and `raise` with built-in exception types
- List, dict, and set comprehensions
- f-strings, including format specs such as `f"{ratio:.2f}"`
- Tuple and starred unpacking (`first, *rest = items`), `**` dict unpacking, and the walrus operator
- Type hints, which are parsed and ignored at runtime
- `class` definitions with methods, and `@dataclass` from `dataclasses`
- `match` statements
- `str.format()`, `%` formatting, and `dict1 | dict2`
- `import x` and `from x import y` for the modules listed below

Not supported in the pinned version:

| Feature | Alternative |
|---------|-------------|
| Generators (`yield`) | Build and return a list |
| `del x` and `del d[key]` | Use `d.pop(key)`, or build a new dict with a comprehension |
| `from module import *` | Import names explicitly |
| Custom exception classes, including subclasses of `Exception` | Raise a built-in type such as `ValueError` |

Unsupported constructs fail the render with `NotImplementedError`, `AttributeError`, or `TypeError`.

### Built-in Types and Functions

The core types are available with their usual methods: `int`, `float`, `bool`, `str`, `bytes`, `list`, `tuple`, `dict`, `set`, `frozenset`, `range`, and `None`.

Built-in functions: `abs`, `all`, `any`, `bin`, `chr`, `divmod`, `enumerate`, `filter`, `getattr`, `hash`, `hex`, `id`, `isinstance`, `len`, `map`, `max`, `min`, `next`, `oct`, `ord`, `pow`, `print`, `repr`, `reversed`, `round`, `sorted`, `sum`, `type`, and `zip`, plus the type constructors above.

Some differences from CPython:

- `callable` is not available, and `hasattr` returns `False` for the methods of built-in types (`hasattr("a", "upper")` is `False`). Check types with `isinstance` instead.
- `enumerate`, `zip`, `map`, `filter`, and `reversed` return lists rather than lazy iterators.
- `print` is accepted, but its output is discarded. Use `warn` to surface information.

### Standard Library Modules

| Module | Notes |
|--------|-------|
| `json` | `loads`, `dumps` (including `indent` and `sort_keys`), and `JSONDecodeError` |
| `re` | `compile`, `search`, `match`, `fullmatch`, `findall`, `finditer`, `sub`, `split`, `escape`, and the `IGNORECASE`, `MULTILINE`, `DOTALL`, and `ASCII` flags. Backed by Rust's `fancy-regex`, so a few edge cases differ from CPython |
| `math` | Common functions such as `floor`, `ceil`, `sqrt`, `log`, `pow`, `isclose`, `gcd`, trigonometric functions, and `pi` |
| `datetime` | `date`, `datetime`, `timedelta`, and `timezone` for constructing, parsing (`fromisoformat`), and doing arithmetic on dates. `datetime.now()` and `date.today()` read the agent's clock, see [Date Arithmetic](#date-arithmetic) |
| `time` | `time.time()` reads the agent's clock |
| `typing` | Names for type hints, such as `Any` and `Optional` |
| `dataclasses` | `@dataclass` |
| `collections` | `Counter` and `defaultdict`. `OrderedDict` is not available, but plain dictionaries keep insertion order |
| `itertools`, `functools` | For example `itertools.chain`, `itertools.product`, and `functools.reduce` |
| `copy` | `copy` and `deepcopy` |
| `base64`, `hashlib` | For example `base64.b64encode` and `hashlib.sha256(...).hexdigest()` |
| `random` | Random numbers. Values change on every render, see [Date Arithmetic](#date-arithmetic) for why that matters |
| `pathlib` | Path manipulation, and reading under `/repo` with methods such as `read_text`, `exists`, `is_dir`, `iterdir`, and `glob`. Writes raise `PermissionError` |
| `os` | `os.getcwd`, `os.listdir`, `os.walk`, and `os.path` functions such as `join`, `exists`, `isdir`, `relpath`, and `normpath`, all limited to `/repo`. `os.getenv` and `os.environ` raise `RuntimeError` |
| `sys` | Interpreter metadata, such as `sys.version_info` |
| `asyncio` | Importable, but there is nothing to await in this context |

Every other module, including `yaml`, `glob`, `uuid`, `string`, `enum`, `textwrap`, `operator`, `subprocess`, and `socket`, is missing and fails with `ModuleNotFoundError`. For YAML, use the [`yaml_encode` and `yaml_decode`](#yaml) globals.

## Reading Files

Python scripts have the same filesystem access as [Lua scripts](lua.md): they can read files from the service root, the same files `valuesFiles` and `pythonFolder` refer to. The service root is mounted read-only at `/repo`, and relative paths resolve against it. The `fs.read` and `fs.walk` builtins mirror Lua's `fs` module, and `open`, `pathlib`, and `os` work on the same view.

### `fs.read(path) -> str`

Returns the contents of a file as text. `path` is relative to the service root, and a leading `/` means the same thing, so `fs.read("config/app.yaml")` and `fs.read("/config/app.yaml")` read the same file.

```python
config = yaml_decode(fs.read("config/app.yaml"))
values["app"] = {"logLevel": config.get("logLevel", "info")}
```

### `fs.walk(dir, ignore_dotfiles=False) -> list[str]`

Returns the paths of every file under `dir`, recursively, relative to the service root rather than to `dir`. Files are listed depth first in name order, and directories themselves are not listed. With `ignore_dotfiles=True`, files and directories whose names start with `.` are skipped, along with everything inside those directories. Pass `"."` to walk the whole service root. If `dir` is a file, the result is just that file.

```python
dashboards = {}
for path in fs.walk("dashboards", ignore_dotfiles=True):
    if path.endswith(".json"):
        dashboards[path.split("/")[-1]] = fs.read(path)
values["grafana"] = {"dashboards": dashboards}
```

Symlinks to directories are listed as files rather than followed. Symlinks that point outside the service root are left out entirely.

### Python's own file APIs

`open`, `pathlib`, and `os` work on the same read-only view, so standard code like this works too:

```python
from pathlib import Path
import os

replicas = Path("replicas.txt").read_text().strip()
charts = sorted(name for name in os.listdir("charts") if os.path.isdir(os.path.join("charts", name)))
```

### Errors

File operations raise the usual Python exceptions, which fail the render unless you catch them:

| Exception | Cause |
|-----------|-------|
| `FileNotFoundError` | The path does not exist |
| `IsADirectoryError` | `fs.read` or `open` was given a directory |
| `PermissionError` | A write, or a path that resolves outside the service root, through `..` or a symlink |
| `TypeError` | `fs.read` or `fs.walk` was given something other than a string |

```python
try:
    overrides = yaml_decode(fs.read(f"overrides/{cluster['handle']}.yaml"))
except FileNotFoundError:
    overrides = {}
values.update(overrides)
```

Unlike Lua's `fs.read` and `fs.walk`, which return `nil` and an error message, the Python helpers raise.

## YAML

YAML helpers are available as globals. They use the same YAML library as Lua's `encoding.yamlEncode` and `encoding.yamlDecode`.

### `yaml_encode(value) -> str`

Serializes a value to a YAML string. `value` may contain `dict`, `list`, `tuple`, `set`, `str`, `int`, `float`, `bool`, `None`, and `datetime.date`:

- Tuples and sets become lists, and dates become `YYYY-MM-DD` strings.
- Dictionary keys are converted to strings and sorted.
- Integers too large for 64 bits are written as strings.
- Anything else, such as a function, raises `TypeError`. `bytes` can't be passed to any of these helpers and fails the render, so convert it with `.decode()` first.

```python
values["config"] = yaml_encode({
    "server": {"port": 8080, "hosts": ["a.example.com", "b.example.com"]},
    "debug": False,
})
# debug: false
# server:
#     hosts:
#         - a.example.com
#         - b.example.com
#     port: 8080
```

### `yaml_decode(text) -> value`

Parses a YAML string. Mappings become dictionaries with sorted keys, and sequences become lists. Timestamps such as `2024-01-01` are kept as the string written in the document. An empty document returns `None`. Invalid YAML raises `ValueError`, and a non-string argument raises `TypeError`.

```python
overrides = yaml_decode(configuration.get("extraValues", "") or "{}")
values["extra"] = overrides

try:
    yaml_decode("a: [")
except ValueError:
    warn("extraValues is not valid YAML")
```

Numbers decoded from YAML come back as `int` or `float` like any other Python value, but `values` passes through JSON on its way to Helm, so integers above 2^53 lose precision (see [Outputs](#outputs)).

## Merging Dictionaries

### `merge(destination, source, strategy="override") -> dict`

Deep-merges `source` into `destination` and returns the result, matching Lua's `utils.merge`. Neither argument is modified.

**Parameters:**
- `destination` (dict): The base dictionary
- `source` (dict): The dictionary to merge on top
- `strategy` (str, optional): `"override"` (default) or `"append"`. Can be passed by position or as a keyword

**Merge Strategies:**
- `"override"`: Nested dictionaries are merged key by key, and every other `source` value, including lists, replaces the `destination` value
- `"append"`: Same as `"override"`, except lists are concatenated, with `destination` items first. A `source` list can't be appended to a `destination` dictionary under the same key, and raises `ValueError`

Passing something other than a dictionary raises `TypeError`, and an unknown strategy raises `ValueError`. Like `yaml_encode`, both dictionaries may only contain the value types listed above, and their keys are converted to strings.

```python
base = {
    "server": {"host": "localhost", "port": 8080, "ssl": {"enabled": False}},
    "features": ["auth", "logging"],
}
override = {
    "server": {"host": "0.0.0.0", "ssl": {"enabled": True, "cert": "prod.crt"}},
    "features": ["metrics"],
}

merged = merge(base, override)
# merged["server"] == {"host": "0.0.0.0", "port": 8080, "ssl": {"enabled": True, "cert": "prod.crt"}}
# merged["features"] == ["metrics"]

appended = merge(base, override, strategy="append")
# appended["features"] == ["auth", "logging", "metrics"]
```

`merge` only combines the dictionaries you pass it. It has no effect on how the script's `values` are layered over the other value sources, which is described in [Value Merge Order](#value-merge-order).

## Kubernetes Object Metadata

Python scripts can look up cached Kubernetes object metadata from the deployment agent. This is a read against the agent's applied-object cache, not a live API request. Annotations are not included.

### `k8s_object_meta(group, version, kind, namespace, name) -> dict | None`

**Parameters:**
- `group` (str): API group. Use `""` for core objects such as Namespace
- `version` (str): API version, for example `"v1"`
- `kind` (str): Kind, for example `"Namespace"`
- `namespace` (str): Namespace, or `""` for cluster-scoped objects
- `name` (str): Object name

**Returns:**
- A `dict` with `uid`, `name`, `namespace`, and `labels` when the object is cached
- `None` when the object is not in the cache

Passing anything other than 5 string arguments raises `TypeError`, and cache errors raise `RuntimeError`.

```python
ns = k8s_object_meta("", "v1", "Namespace", "", "kube-system")
if ns:
    values["observeClusterId"] = ns["uid"]
    values["label"] = ns["labels"]["kubernetes.io/metadata.name"]
```

## Service Warnings

Python scripts can report non-fatal problems back to the service with `warn`. Warnings are shown in the service errors in the Plural Console, but unlike errors they do not fail the deployment.

### `warn(message)`

**Parameters:**
- `message` (str): Warning message to report

Calling `warn` with anything other than a string raises `TypeError`.

Keep in mind that:
- A service with warnings is marked as `stale` instead of `healthy` until the script stops reporting them.
- Warnings are collected on every render, so keep messages deterministic, e.g. do not include timestamps.
- Empty and duplicate messages are dropped, and up to 20 warnings of at most 1 KB each are reported per render.

```python
ns = k8s_object_meta("", "v1", "Namespace", "", "kube-system")
if ns:
    values["observeClusterId"] = ns["uid"]
else:
    warn("kube-system namespace not found in the agent cache, observeClusterId will not be set")
```

## Error Handling

Any uncaught exception fails the render, and the service reports an error.

To avoid leaking secrets from `configuration` or `imports`, the reported error contains only the exception type and its location in the [combined program](#script-sources-and-concatenation-order). The exception message is never shown:

```
python templating error: python ValueError at helm-values.py:12:5
```

Syntax errors are reported the same way, for example `python SyntaxError at helm-values.py:4:9`.

Warnings from a failed render are discarded, so calling `warn` right before raising doesn't help. Use `warn` for problems the script can recover from, and keep fatal checks small enough that the exception type and line identify the cause:

```python
def require(key):
    value = configuration.get(key)
    if not value:
        raise KeyError(key)
    return value

values["database"] = {"host": require("dbHost")}

replicas = configuration.get("replicas", "2")
try:
    values["replicaCount"] = int(replicas)
except ValueError:
    warn("replicas configuration is not an integer, defaulting to 2")
    values["replicaCount"] = 2
```

## Examples

### Environment Overlays

Shared defaults and per-environment overrides can live in a `pythonFolder` file, with the main script picking the overlay. Because the files are concatenated, names defined in the folder are visible to the main script.

```python
# python/00-defaults.py
DEFAULTS = {"resources": {"requests": {"cpu": "100m", "memory": "128Mi"}}}
OVERLAYS = {"prod": {"resources": {"requests": {"cpu": "500m"}}}}
```

```python
# pythonScript
env = configuration.get("environment", "dev")
values.update(merge(DEFAULTS, OVERLAYS.get(env, {})))
# values["resources"]["requests"] == {"cpu": "500m", "memory": "128Mi"}
```

### Embedding YAML Config

Some charts take a whole config file as a string value. Build it as a dictionary and serialize it at the end.

```python
config = yaml_decode("""
logLevel: info
receivers:
  - otlp
""")
if configuration.get("environment") == "prod":
    config = merge(config, {"logLevel": "warn", "receivers": ["prometheus"]}, "append")

values["configYaml"] = yaml_encode(config)
```

### Version-Dependent Configuration

```python
import re

version = cluster["currentVersion"] or cluster["version"] or ""
match = re.match(r"^v?(\d+)\.(\d+)", version)
if match:
    minor = int(match.group(2))
    values["podDisruptionBudget"] = {"apiVersion": "policy/v1" if minor >= 21 else "policy/v1beta1"}
else:
    warn(f"could not parse cluster version {version!r}")
```

### Selecting Values Files

```python
env = configuration.get("environment", "dev")
region = cluster["tags"].get("region")

valuesFiles.append(f"values/{env}.yaml")
if region:
    valuesFiles.append(f"values/{env}-{region}.yaml")
```

The agent loads these files from the service tarball and merges them in the order listed, so later files override earlier ones.

### Generating Structured Config

```python
import json

endpoints = sorted(contexts.get("endpoints", {}).get("hosts", []))
values["configJson"] = json.dumps({"upstreams": endpoints, "retries": 3}, sort_keys=True)
values["ingress"] = {
    "hosts": [{"host": host, "paths": [{"path": "/", "pathType": "Prefix"}]} for host in endpoints],
}
```

### Date Arithmetic

`datetime.now()`, `date.today()`, `time.time()`, and `random` give a different result on every render, so values built from them change each time the agent reconciles the service. Take dates from configuration instead, so the rendered values only change when you change them.

```python
import datetime

start = configuration.get("maintenanceStart")
if start:
    begins = datetime.date.fromisoformat(start)
    values["maintenance"] = {
        "start": str(begins),
        "end": str(begins + datetime.timedelta(days=7)),
    }
```

## Migrating from Lua

| Lua | Python |
|-----|--------|
| `luaScript` / `luaFile` / `luaFolder` | `pythonScript` / `pythonFile` / `pythonFolder` |
| `values["key"] = value` | `values["key"] = value` |
| `valuesFiles = {"a.yaml"}` | `valuesFiles.append("a.yaml")` |
| `encoding.jsonEncode` / `jsonDecode` | `json.dumps` / `json.loads` |
| `encoding.yamlEncode` / `yamlDecode` | `yaml_encode` / `yaml_decode` |
| `encoding.jsonSchema` | Not available |
| `fs.read(path)`, returns the contents or `nil` and an error | `fs.read(path)`, returns the contents or raises |
| `fs.walk(dir, ignoreDotfiles)` | `fs.walk(dir, ignore_dotfiles=False)` |
| `utils.merge(dst, src, strategy)` | `merge(dst, src, strategy)` |
| `utils.splitString(s, d)` | `s.split(d)` |
| `utils.pathJoin(parts)` | `"/".join(parts)` |
| `k8s_object_meta(...)`, returns a table or `nil` | `k8s_object_meta(...)`, returns a `dict` or `None` |
| `warn(message)` | `warn(message)` |
| `error("message")` / `pcall` | `raise ValueError(...)` / `try` / `except` |

Lua and Python are mutually exclusive. If any Python field is set, Python runs and Lua fields are ignored (including a leftover `luaFile` after migration). Clear the Lua fields when you cut over so Console state matches the service. See [Value Merge Order](#value-merge-order).
