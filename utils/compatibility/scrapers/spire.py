from __future__ import annotations

import re
from collections import OrderedDict

import yaml

from utils import (
    current_kube_version,
    fetch_page,
    get_chart_images,
    print_error,
    read_yaml,
    update_compatibility_info,
    validate_semver,
    write_yaml,
)


APP_NAME = "spire"
CHART_NAME = "spire"
HELM_REPOSITORY_URL = "https://spiffe.github.io/helm-charts-hardened"
HELM_INDEX_URL = f"{HELM_REPOSITORY_URL}/index.yaml"
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


def _next_minor(major, minor):
    return major, minor + 1


def _version_tuple(major, minor, patch=0):
    return int(major), int(minor), int(patch or 0)


def _parse_constraints(spec):
    normalized = spec.replace(",", " ")
    constraints = []

    for operator, major, minor, patch in re.findall(
        r"(>=|<=|<|>|=)?\s*v?(\d+)\.(\d+)(?:\.(\d+))?",
        normalized,
    ):
        constraints.append((operator or ">=", _version_tuple(major, minor, patch)))

    return constraints


def _minor_satisfies_constraints(major, minor, constraints):
    start = (major, minor, 0)
    end = (*_next_minor(major, minor), 0)

    for operator, bound in constraints:
        if operator in (">=", ">"):
            if end <= bound:
                return False
        elif operator == "<":
            if start >= bound:
                return False
        elif operator == "<=":
            if start > bound:
                return False
        elif operator == "=":
            if not (start <= bound < end):
                return False

    return True


def parse_kube_constraint(spec, latest_kube):
    if not spec or not latest_kube:
        return []

    latest = _minor_bounds(latest_kube)
    if not latest:
        return []

    constraints = _parse_constraints(spec)
    lower_bounds = [
        (bound[0], bound[1])
        for operator, bound in constraints
        if operator in (">=", ">", "=")
    ]
    if not constraints or not lower_bounds:
        return []

    major, minor = max(lower_bounds)
    kube_versions = []

    while (major, minor) <= latest:
        if _minor_satisfies_constraints(major, minor, constraints):
            kube_versions.append(f"{major}.{minor}")
        major, minor = _next_minor(major, minor)

    return kube_versions


def load_index(content):
    try:
        return yaml.safe_load(content)
    except yaml.YAMLError as exc:
        print_error(f"Failed to parse SPIRE Helm index: {exc}")
        return None


def _spire_workload_tags(images):
    tags = set()

    for image in images:
        match = re.search(r"ghcr\.io/spiffe/spire-(?:server|agent):([^@]+)", image)
        if match:
            tags.add(match.group(1).lstrip("v"))

    return tags


def _chart_images_for_version(chart_version):
    return get_chart_images(HELM_REPOSITORY_URL, CHART_NAME, chart_version) or []


def _chart_matches_app_version(app_version, chart_version):
    images = _chart_images_for_version(chart_version)
    return _spire_workload_tags(images) == {app_version}, images


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

        if app_version in rows_by_version:
            continue

        matches_app_version, images = _chart_matches_app_version(
            app_version,
            chart_version,
        )
        if not matches_app_version:
            continue

        rows_by_version[app_version] = OrderedDict(
            [
                ("version", app_version),
                ("kube", kube_versions),
                ("chart_version", chart_version),
                ("images", images),
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
        if version.get("version") in keep or _has_curated_metadata(version)
    ]
    write_yaml(filepath, data)


def _has_curated_metadata(version):
    return bool(
        version.get("requirements")
        or version.get("incompatibilities")
        or version.get("summary")
    )


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
        print_error("No SPIRE versions extracted from Helm index.")
        return

    prune_stale_representatives(OUTPUT_PATH, rows)
    update_compatibility_info(OUTPUT_PATH, rows)
