"""VolSync's published Helm installation constraints, not a runtime test matrix."""

import re
from collections import OrderedDict

import yaml

APP_NAME = "volsync"
INDEX_URL = "https://backube.github.io/helm-charts/index.yaml"
OUTPUT_PATH = "../../static/compatibilities/volsync.yaml"


def stable_version(value):
    """Only accept full stable semantic versions; exclude RCs and build variants."""
    if not isinstance(value, str):
        return None
    match = re.fullmatch(r"v?((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))", value)
    return match.group(1) if match else None


def version_key(value):
    return tuple(int(part) for part in value.split("."))


def declared_kube_versions(constraint, current):
    """Expand VolSync's published caret constraints only through Plural's cap.

    Helm's ^1.N.0-0 includes stable 1.N.0 and later 1.x releases, but not 2.x.
    Refuse other syntax instead of silently losing an upper bound or patch floor.
    This expresses chart eligibility; it does not certify storage or CSI support.
    """
    match = re.fullmatch(r"\^1\.(0|[1-9]\d*)\.0-0", str(constraint))
    cap = re.fullmatch(r"1\.(0|[1-9]\d*)", str(current))
    if not match:
        raise ValueError(f"Unsupported VolSync kubeVersion constraint: {constraint!r}")
    if not cap:
        raise ValueError(f"Unsupported Plural Kubernetes version: {current!r}")
    minimum, maximum = int(match.group(1)), int(cap.group(1))
    if minimum > maximum:
        raise ValueError("VolSync minimum Kubernetes version exceeds Plural's cap")
    return [f"1.{minor}" for minor in range(maximum, minimum - 1, -1)]


def build_rows(content, current):
    try:
        index = yaml.safe_load(content)
    except (yaml.YAMLError, UnicodeError) as exc:
        raise ValueError("Could not parse VolSync Helm index") from exc
    entries = index.get("entries") if isinstance(index, dict) else None
    charts = entries.get(APP_NAME) if isinstance(entries, dict) else None
    if not isinstance(charts, list) or not charts:
        raise ValueError("VolSync chart entries not found")

    selected = {}
    seen = {}
    for chart in charts:
        if not isinstance(chart, dict):
            raise ValueError("Malformed VolSync chart entry")
        app_version = stable_version(chart.get("appVersion"))
        chart_version = stable_version(chart.get("version"))
        if not app_version or not chart_version:
            continue
        constraint = chart.get("kubeVersion")
        # A duplicate chart version with different metadata is ambiguous.
        identity = (app_version, constraint)
        if chart_version in seen and seen[chart_version] != identity:
            raise ValueError(f"Conflicting VolSync chart metadata for {chart_version}")
        seen[chart_version] = identity
        kube = declared_kube_versions(constraint, current)
        previous = selected.get(app_version)
        if previous and version_key(previous["chart_version"]) >= version_key(chart_version):
            continue
        selected[app_version] = OrderedDict([
            ("version", app_version),
            ("kube", kube),
            ("chart_version", chart_version),
            ("requirements", []),
            ("incompatibilities", []),
        ])

    if not selected:
        raise ValueError("No stable VolSync compatibility rows generated")
    return [selected[version] for version in sorted(selected, key=version_key, reverse=True)]


def scrape():
    from utils import current_kube_version, fetch_page, update_compatibility_info

    content = fetch_page(INDEX_URL)
    if not content:
        raise ValueError("Could not fetch VolSync Helm index; existing data unchanged")
    # Validate every selected source row before calling the shared writer.
    rows = build_rows(content, current_kube_version())
    update_compatibility_info(OUTPUT_PATH, rows)
