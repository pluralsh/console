"""Record release-tagged Linux KinD E2E targets, not a full support window."""

from collections import OrderedDict
from copy import deepcopy
import re

import requests
import yaml

from utils import print_error, read_yaml, reduce_versions, update_compatibility_info

APP_NAME = "dapr"
INDEX_URL = "https://dapr.github.io/helm-charts/index.yaml"
WORKFLOW_URL = "https://raw.githubusercontent.com/dapr/dapr/v{version}/.github/workflows/kind-e2e.yaml"
TARGET_FILE = "../../static/compatibilities/dapr.yaml"
# Dapr documents support for its current and two preceding minor releases.
SUPPORTED_MINOR_COUNT = 3


class UniqueLoader(yaml.SafeLoader):
    """Reject ambiguous source mappings instead of silently keeping the last key."""


def _unique_mapping(loader, node, deep=False):
    mapping = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if not isinstance(key, (str, int, float, bool)) or key in mapping:
            raise ValueError(f"Invalid or duplicate YAML key: {key!r}")
        mapping[key] = loader.construct_object(value_node, deep=deep)
    return mapping


UniqueLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _unique_mapping)


def _version(value):
    if not isinstance(value, str) or not re.fullmatch(r"v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)", value):
        return None
    return tuple(map(int, value.lstrip("v").split(".")))


def parse_charts(content):
    data = yaml.load(content, Loader=UniqueLoader)
    entries = data.get("entries") if isinstance(data, dict) else None
    entries = entries.get(APP_NAME) if isinstance(entries, dict) else None
    if not isinstance(entries, list) or not entries:
        raise ValueError("Dapr Helm index has no chart entries")
    charts, app_by_chart = {}, {}
    for entry in entries:
        if not isinstance(entry, dict) or entry.get("name") != APP_NAME:
            raise ValueError("Invalid Dapr Helm chart entry")
        app, chart = _version(entry.get("appVersion")), _version(entry.get("version"))
        if app is None or chart is None or entry.get("deprecated"):
            continue
        if chart in app_by_chart and app_by_chart[chart] != app:
            raise ValueError("Dapr chart version maps to conflicting application versions")
        app_by_chart[chart] = app
        if app not in charts or chart > charts[app]:
            charts[app] = chart
    if not charts:
        raise ValueError("Dapr Helm index has no stable application/chart pairs")
    minors = sorted({app[:2] for app in charts})[-SUPPORTED_MINOR_COUNT:]
    return {".".join(map(str, app)): ".".join(map(str, chart))
            for app, chart in charts.items() if app[:2] in minors}


def parse_kubernetes_targets(content):
    data = yaml.load(content, Loader=UniqueLoader)
    jobs = data.get("jobs") if isinstance(data, dict) else None
    job = jobs.get("e2e") if isinstance(jobs, dict) else None
    strategy = job.get("strategy") if isinstance(job, dict) else None
    matrix = strategy.get("matrix") if isinstance(strategy, dict) else None
    if not isinstance(matrix, dict) or "if" in job or not str(job.get("runs-on", "")).startswith("ubuntu-"):
        raise ValueError("Dapr workflow has no unconditional finite e2e matrix")
    if set(matrix) - {"k8s-version", "mode", "include", "exclude"} or matrix.get("exclude"):
        raise ValueError("Unsupported Dapr matrix axes or exclusions")
    versions, modes, includes = matrix.get("k8s-version"), matrix.get("mode"), matrix.get("include")
    if not isinstance(versions, list) or not versions or any(_version(v) is None for v in versions):
        raise ValueError("Dapr Kubernetes targets must be explicit stable patch versions")
    if len(set(versions)) != len(versions):
        raise ValueError("Duplicate Dapr Kubernetes targets")
    if not isinstance(modes, list) or not modes or any(not isinstance(m, str) or not m for m in modes):
        raise ValueError("Dapr matrix must declare finite deployment modes")
    if not isinstance(includes, list) or not includes:
        raise ValueError("Dapr matrix must pin each KinD node image")
    pins = {}
    for entry in includes:
        if not isinstance(entry, dict) or entry.get("k8s-version") not in versions or "mode" in entry:
            raise ValueError("Unsupported Dapr matrix include combination")
        version = entry["k8s-version"]
        if _version(entry.get("kind-version")) is None or not re.fullmatch(r"sha256:[a-f0-9]{64}", str(entry.get("kind-image-sha", ""))):
            raise ValueError("Dapr KinD version or node image digest is invalid")
        if version in pins and pins[version] != entry:
            raise ValueError("Conflicting Dapr matrix include entries")
        pins[version] = entry
    if set(pins) != set(versions):
        raise ValueError("Dapr matrix has an unpinned Kubernetes target")
    steps = job.get("steps")
    if not isinstance(steps, list) or any(not isinstance(step, dict) for step in steps):
        raise ValueError("Invalid Dapr E2E workflow steps")
    scripts = [step.get("run", "") for step in steps if isinstance(step.get("run", ""), str) and "if" not in step]
    lines = [line.strip() for script in scripts for line in script.splitlines()]
    if "image: kindest/node:${{ matrix.k8s-version }}@${{ matrix.kind-image-sha }}" not in lines:
        raise ValueError("Dapr workflow does not use the pinned Kubernetes matrix")
    checkouts = [step for step in steps if str(step.get("uses", "")).startswith("actions/checkout@")]
    checkout_options = (checkouts[0].get("with") or {}) if len(checkouts) == 1 else None
    if not isinstance(checkout_options, dict) or checkout_options.get("ref"):
        raise ValueError("Dapr workflow must check out its own runtime revision")
    for target in ("build-linux", "docker-build", "docker-deploy-k8s", "test-e2e-all"):
        if not any(re.fullmatch(r"make\s+" + target + r"\s*(?:#.*)?", line) for line in lines):
            raise ValueError(f"Dapr workflow does not run make {target}")
    return sorted({".".join(map(str, _version(v)[:2])) for v in versions},
                  key=lambda value: tuple(map(int, value.split("."))), reverse=True)


def _fetch(url):
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return response.content


def build_updates(charts, existing, fetch_workflow):
    recorded = {row["version"]: row for row in existing}
    updates = []
    for version, chart in sorted(charts.items(), key=lambda pair: _version(pair[0]), reverse=True):
        previous = recorded.get(version)
        if previous and previous.get("chart_version"):
            continue
        if previous:
            row = deepcopy(previous)
            row["chart_version"] = chart
        else:
            kube = parse_kubernetes_targets(fetch_workflow(WORKFLOW_URL.format(version=version)))
            row = OrderedDict([
                ("version", version), ("kube", kube), ("requirements", []),
                ("incompatibilities", []), ("chart_version", chart),
            ])
        updates.append(row)
    combined = deepcopy(recorded)
    combined.update({row["version"]: row for row in updates})
    retained = {row["version"] for row in reduce_versions(list(combined.values()))}
    return [row for row in updates if row["version"] in retained]


def scrape():
    existing = read_yaml(TARGET_FILE)
    if not isinstance(existing, dict) or not isinstance(existing.get("versions"), list):
        print_error("Existing Dapr compatibility metadata is missing or invalid")
        return
    try:
        charts = parse_charts(_fetch(INDEX_URL))
        updates = build_updates(charts, existing["versions"], _fetch)
    except (requests.RequestException, ValueError, yaml.YAMLError) as error:
        print_error(f"Cannot refresh Dapr compatibility: {error}")
        return
    if updates:
        update_compatibility_info(TARGET_FILE, updates)
