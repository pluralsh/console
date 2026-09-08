"""MetalLB Helm installation constraints, not a Kubernetes test certification."""

import re
from collections import OrderedDict

import requests
import yaml
from packaging.version import Version

from utils import current_kube_version, update_compatibility_info

APP_NAME = "metallb"
INDEX_URL = "https://metallb.github.io/metallb/index.yaml"
STABLE = re.compile(r"v?(\d+\.\d+\.\d+)")
FLOOR = re.compile(r">=\s*(1)\.(\d+)\.0(?:-0)?")


def stable_version(value):
    match = STABLE.fullmatch(value) if isinstance(value, str) else None
    return match.group(1) if match else None


def extract_rows(content, ceiling):
    """Only expand the exact lower-bound syntax published by MetalLB's charts.

    The ceiling bounds output to the repository's known Kubernetes releases.
    It is not evidence of an upstream maximum or successful runtime tests.
    """
    if not isinstance(ceiling, str) or not re.fullmatch(r"1\.\d+", ceiling):
        raise ValueError("Invalid Kubernetes ceiling")
    index = yaml.safe_load(content)
    catalog = index.get("entries") if isinstance(index, dict) else None
    entries = catalog.get(APP_NAME) if isinstance(catalog, dict) else None
    if not isinstance(entries, list) or not entries:
        raise ValueError("Missing MetalLB chart entries")
    rows = {}
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError("Invalid chart entry")
        app = stable_version(entry.get("appVersion"))
        chart = stable_version(entry.get("version"))
        if not app or not chart or chart == "0.0.0":
            continue
        constraint = entry.get("kubeVersion")
        if constraint is None:
            # Older charts publish no version constraint. Do not invent one.
            continue
        match = FLOOR.fullmatch(constraint.strip()) if isinstance(constraint, str) else None
        if not match:
            raise ValueError(f"Unsupported MetalLB constraint: {constraint!r}")
        floor, maximum = int(match.group(2)), int(ceiling.split(".")[1])
        if floor > maximum:
            continue
        row = OrderedDict([
            ("version", app),
            ("kube", [f"1.{minor}" for minor in range(maximum, floor - 1, -1)]),
            ("chart_version", chart),
            ("images", []),
            ("requirements", []),
            ("incompatibilities", []),
        ])
        if app not in rows or Version(chart) > Version(rows[app]["chart_version"]):
            rows[app] = row
    if not rows:
        raise ValueError("No stable charts with explicit Kubernetes constraints")
    return sorted(rows.values(), key=lambda row: Version(row["version"]), reverse=True)


def scrape():
    response = requests.get(INDEX_URL, timeout=30)
    response.raise_for_status()
    rows = extract_rows(response.content, current_kube_version())
    # Complete source validation before invoking the repository's merge writer.
    update_compatibility_info(f"../../static/compatibilities/{APP_NAME}.yaml", rows)
