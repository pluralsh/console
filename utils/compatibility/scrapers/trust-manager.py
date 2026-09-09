"""Read per-release Helm requirements, not a runtime-tested support matrix."""

import re
from collections import OrderedDict

import yaml
from semantic_version import Version

APP_NAME = "trust-manager"
INDEX_URL = "https://charts.jetstack.io/index.yaml"
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"


def stable_version(value):
    if not isinstance(value, str):
        return None
    try:
        version = Version(value.removeprefix("v"))
    except ValueError:
        return None
    return None if version.prerelease or version.build else version


def extract_rows(content, ceiling):
    """Bound explicit Helm minima by the catalog ceiling; never infer missing ones."""
    if not re.fullmatch(r"1\.\d+", ceiling or ""):
        raise ValueError("Expected a Kubernetes 1.x catalog ceiling")
    index = yaml.safe_load(content)
    if not isinstance(index, dict):
        raise ValueError("Invalid Helm index")
    entries = index.get("entries", {}).get(APP_NAME)
    if not isinstance(entries, list) or not entries:
        raise ValueError("No trust-manager charts in Helm index")

    selected = {}
    for chart in entries:
        if not isinstance(chart, dict):
            raise ValueError("Invalid chart entry")
        app = stable_version(chart.get("appVersion"))
        version = stable_version(chart.get("version"))
        if app is None or version is None or chart.get("deprecated"):
            continue
        if app not in selected or version > selected[app][0]:
            selected[app] = (version, chart)

    rows = []
    for app, (version, chart) in sorted(selected.items(), reverse=True):
        constraint = chart.get("kubeVersion")
        if constraint is None:
            continue
        # All current upstream constraints use this form. Fail on new forms
        # rather than silently broadening a bounded or patch-specific range.
        match = re.fullmatch(r">=\s*1\.(\d+)\.0(?:-0)?", str(constraint).strip())
        if not match:
            raise ValueError(f"Unsupported kubeVersion for {app}: {constraint}")
        minimum, maximum = int(match[1]), int(ceiling.split(".")[1])
        if minimum > maximum:
            continue
        rows.append(OrderedDict([
            ("version", str(app)),
            ("kube", [f"1.{minor}" for minor in range(maximum, minimum - 1, -1)]),
            ("chart_version", str(chart["version"])),
            ("requirements", []),
            ("incompatibilities", []),
            ("kube_constraint", str(constraint)),
            ("compatibility_source", INDEX_URL),
        ]))
    if not rows:
        raise ValueError("No explicit trust-manager compatibility rows found")
    return rows


def scrape():
    from utils import current_kube_version, fetch_page, update_compatibility_info

    content = fetch_page(INDEX_URL)
    if not content:
        return
    # Parse completely before invoking the writer so malformed upstream input
    # cannot replace the last known data with a partially parsed result.
    rows = extract_rows(content, current_kube_version())
    update_compatibility_info(TARGET_FILE, rows)
