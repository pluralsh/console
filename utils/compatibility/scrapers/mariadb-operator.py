from __future__ import annotations

import re
from collections import OrderedDict

import yaml

from utils import (
    current_kube_version,
    expand_kube_versions,
    fetch_page,
    print_error,
    read_yaml,
    update_compatibility_info,
    validate_semver,
    write_yaml,
)


APP_NAME = "mariadb-operator"
CHART_NAME = "mariadb-operator"
HELM_INDEX_URL = "https://mariadb-operator.github.io/mariadb-operator/index.yaml"
OUTPUT_PATH = f"../../static/compatibilities/{APP_NAME}.yaml"


def _clean_version(version):
    parsed = validate_semver(str(version).strip().lstrip("v"))
    return str(parsed) if parsed else None


def _minor(version):
    parsed = validate_semver(version)
    if not parsed:
        return None
    return f"{parsed.major}.{parsed.minor}"


def _minor_bounds(version):
    parsed = validate_semver(version)
    if not parsed:
        return None
    return parsed.major, parsed.minor


def parse_kube_constraint(spec, latest_kube):
    if not spec or not latest_kube:
        return []

    latest = _minor_bounds(latest_kube)
    if not latest:
        return []

    lower = None
    upper = latest
    normalized = spec.replace(",", " ")

    for operator, major, minor in re.findall(r"(>=|<=|<|>|=)?\s*v?(\d+)\.(\d+)", normalized):
        bound = (int(major), int(minor))

        if operator in ("", ">=", ">", "="):
            if operator == ">":
                bound = (bound[0], bound[1] + 1)
            if lower is None or bound > lower:
                lower = bound
        elif operator in ("<", "<="):
            if operator == "<":
                bound = (bound[0], bound[1] - 1)
            if upper is None or bound < upper:
                upper = bound

    if lower is None or upper is None or lower > upper:
        return []

    start = f"{lower[0]}.{lower[1]}"
    end = f"{upper[0]}.{upper[1]}"
    return expand_kube_versions(start, end)


def load_index(content):
    try:
        return yaml.safe_load(content)
    except yaml.YAMLError as exc:
        print_error(f"Failed to parse MariaDB Operator Helm index: {exc}")
        return None


def extract_rows(index_yaml, latest_kube):
    rows_by_version = {}
    entries = index_yaml.get("entries", {}).get(CHART_NAME, [])

    for entry in entries:
        app_version = _clean_version(entry.get("appVersion", ""))
        chart_version = _clean_version(entry.get("version", ""))
        if not app_version or not chart_version:
            continue

        kube_versions = parse_kube_constraint(entry.get("kubeVersion", ""), latest_kube)
        if not kube_versions:
            continue

        current = rows_by_version.get(app_version)
        if current and validate_semver(chart_version) <= validate_semver(current["chart_version"]):
            continue

        rows_by_version[app_version] = OrderedDict(
            [
                ("version", app_version),
                ("kube", kube_versions),
                ("chart_version", chart_version),
                ("images", []),
                ("requirements", []),
                ("incompatibilities", []),
            ]
        )

    rows = sorted(
        rows_by_version.values(),
        key=lambda row: validate_semver(row["version"]),
        reverse=True,
    )
    return _representative_rows(rows)


def _representative_rows(rows):
    selected = []
    seen = {}

    for row in rows:
        minor = _minor(row["version"])
        if not minor:
            continue

        kube = tuple(row["kube"])
        if minor not in seen:
            selected.append(row)
            seen[minor] = kube
            continue

        if seen[minor] != kube:
            selected.append(row)
            seen[minor] = kube

    return selected


def prune_stale_representatives(filepath, rows):
    data = read_yaml(filepath)
    if not data or "versions" not in data:
        return

    keep = {row["version"] for row in rows}
    data["versions"] = [
        version
        for version in data.get("versions", [])
        if version.get("version") in keep
    ]
    write_yaml(filepath, data)
def scrape():
    latest_kube = current_kube_version()
    if not latest_kube:
        print_error("Could not determine current Kubernetes version from KUBE_VERSION.")
        return

    content = fetch_page(HELM_INDEX_URL)
    if not content:
        return

    index_yaml = load_index(content)
    if not index_yaml:
        return

    rows = extract_rows(index_yaml, latest_kube)
    if not rows:
        print_error("No MariaDB Operator versions extracted from Helm index.")
        return

    prune_stale_representatives(OUTPUT_PATH, rows)
    update_compatibility_info(OUTPUT_PATH, rows)
