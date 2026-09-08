"""MetalLB Helm compatibility from each published chart's kubeVersion."""

import re
from collections import OrderedDict

import yaml
from packaging.version import Version

INDEX_URL = "https://metallb.github.io/metallb/index.yaml"
FIRST_CONSTRAINED_RELEASE = Version("0.13.9")


def stable_version(value):
    if not isinstance(value, str) or not re.fullmatch(r"v?\d+\.\d+\.\d+", value):
        return None
    return value.removeprefix("v")


def build_rows(index, current_kube):
    """Encode chart install constraints, not a matrix of cluster test results.

    Only the observed >= major.minor.0[-0] constraint is supported. A future
    constraint change must be reviewed instead of silently widening support.
    """
    ceiling = re.fullmatch(r"1\.(\d+)", current_kube)
    if not ceiling:
        raise ValueError("Expected a Kubernetes 1.minor ceiling")
    maximum = int(ceiling.group(1))
    if not isinstance(index, dict) or not isinstance(index.get("entries"), dict):
        raise ValueError("Missing Helm index entries")
    entries = index["entries"].get("metallb")
    if not isinstance(entries, list) or not entries:
        raise ValueError("Missing MetalLB chart entries")

    selected = {}
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError("Malformed MetalLB chart entry")
        app = stable_version(entry.get("appVersion"))
        chart = stable_version(entry.get("version"))
        if not app or not chart or chart == "0.0.0":
            continue  # The official index contains a development 0.0.0 chart.
        if Version(app) < FIRST_CONSTRAINED_RELEASE:
            continue  # Older official charts do not declare kubeVersion.
        constraint = entry.get("kubeVersion")
        match = re.fullmatch(r">=\s*1\.(\d+)\.0(?:-0)?", constraint or "")
        if not match:
            raise ValueError(f"Unsupported or missing kubeVersion for MetalLB {app}: {constraint!r}")
        minimum = int(match.group(1))
        if minimum > maximum:
            raise ValueError(f"Kubernetes ceiling precedes the minimum for MetalLB {app}")
        if app in selected:
            previous_chart, previous_minimum = selected[app]
            if chart == previous_chart and minimum != previous_minimum:
                raise ValueError(f"Conflicting duplicate chart metadata for MetalLB {app}")
            if Version(chart) <= Version(previous_chart):
                continue
        selected[app] = (chart, minimum)

    if not selected:
        raise ValueError("No stable MetalLB charts with supported constraints")
    return [OrderedDict([
        ("version", app),
        ("kube", [f"1.{minor}" for minor in range(maximum, selected[app][1] - 1, -1)]),
        ("chart_version", selected[app][0]),
        ("images", []),
        ("requirements", []),
        ("incompatibilities", []),
    ]) for app in sorted(selected, key=Version, reverse=True)]


def scrape():
    from utils import current_kube_version, fetch_page, update_compatibility_info

    page = fetch_page(INDEX_URL)
    if not page:
        raise ValueError("Could not fetch the official MetalLB chart index")
    rows = build_rows(yaml.safe_load(page), current_kube_version())
    update_compatibility_info("../../static/compatibilities/metallb.yaml", rows)
