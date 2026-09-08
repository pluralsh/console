"""Read release-specific Kubernetes bounds from the official StackGres charts."""

import re
from collections import OrderedDict

import yaml

APP_NAME = "stackgres"
CHART_NAME = "stackgres-operator"
HELM_REPOSITORY_URL = "https://stackgres.io/downloads/stackgres-k8s/stackgres/helm"
INDEX_URL = f"{HELM_REPOSITORY_URL}/index.yaml"
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"

STABLE_VERSION = re.compile(r"v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)")
KUBE_RANGE = re.compile(r"1\.(\d+)\.0(?:-0)?\s+-\s+1\.(\d+)\.[xX*](?:-0)?")


def stable_version(value):
    """Ignore prereleases and non-semver entries in the public Helm index."""
    match = STABLE_VERSION.fullmatch(str(value).strip())
    return tuple(map(int, match.groups())) if match else None


def parse_kube_range(spec):
    """Expand StackGres's inclusive, bounded Helm range into Kubernetes minors.

    Refuse unbounded or unfamiliar constraints instead of inferring support from
    Plural's current Kubernetes version or StackGres's moving /latest docs.
    """
    if not isinstance(spec, str):
        raise ValueError("StackGres Kubernetes constraint must be a string")
    match = KUBE_RANGE.fullmatch(spec.strip())
    if not match:
        raise ValueError(f"Unsupported StackGres Kubernetes constraint: {spec!r}")
    start, end = map(int, match.groups())
    if start > end:
        raise ValueError(f"Reversed StackGres Kubernetes constraint: {spec!r}")
    return [f"1.{minor}" for minor in range(end, start - 1, -1)]


def build_rows(index_payload):
    index = yaml.safe_load(index_payload)
    entries = index.get("entries") if isinstance(index, dict) else None
    charts = entries.get(CHART_NAME) if isinstance(entries, dict) else None
    if not isinstance(charts, list) or not charts:
        raise ValueError("Official StackGres operator chart entries not found")

    releases = {}
    for chart in charts:
        if not isinstance(chart, dict):
            raise ValueError("Malformed StackGres operator chart entry")
        app_version = stable_version(chart.get("appVersion"))
        chart_version = stable_version(chart.get("version"))
        if app_version is None or chart_version is None:
            continue
        constraint = chart.get("kubeVersion")
        if constraint is None:
            # The official pre-1.5 charts omit this field. Missing metadata does
            # not prove that a historical release supports current Kubernetes.
            if app_version < (1, 5, 0):
                continue
            raise ValueError(f"Missing Kubernetes bounds for StackGres {chart['appVersion']}")
        kube = parse_kube_range(constraint)
        previous = releases.get(app_version)
        if previous is not None:
            previous_chart, previous_kube = previous
            if previous_chart == chart_version and previous_kube != kube:
                raise ValueError(f"Conflicting StackGres chart metadata: {chart['version']}")
            if previous_chart >= chart_version:
                continue
        releases[app_version] = (chart_version, kube)

    if not releases:
        raise ValueError("No stable StackGres releases with Kubernetes bounds found")

    # Keep all published patch versions here. The shared catalog reducer keeps
    # compatibility transitions, including bounds that change within a minor.
    return [
        OrderedDict([
            ("version", ".".join(map(str, app_version))),
            ("kube", kube),
            ("requirements", []),
            ("incompatibilities", []),
            ("chart_version", ".".join(map(str, chart_version))),
        ])
        for app_version, (chart_version, kube) in sorted(releases.items(), reverse=True)
    ]


def scrape():
    from utils import fetch_page, update_compatibility_info

    index = fetch_page(INDEX_URL)
    if not index:
        raise ValueError("Could not fetch the official StackGres Helm index")
    rows = build_rows(index)
    update_compatibility_info(TARGET_FILE, rows)
