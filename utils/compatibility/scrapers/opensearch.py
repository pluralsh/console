from __future__ import annotations

import re
from collections import OrderedDict
from typing import Callable, Optional

import yaml

from utils import (
    expand_kube_versions,
    fetch_page,
    latest_kube_version,
    print_error,
    print_warning,
    read_yaml,
    update_chart_versions,
    update_compatibility_info,
    validate_semver,
)

app_name = "opensearch"

REPO_OWNER = "opensearch-project"
REPO_NAME = "helm-charts"
CHART_NAME = "opensearch"
MAX_RELEASES = 15
# The compatibility matrix tracks the three newest Kubernetes minors per row.
LATEST_KUBE_MINORS = 3

README_URL = (
    "https://raw.githubusercontent.com/{owner}/{name}/{commitish}/README.md"
)
HELM_INDEX_URL = (
    f"https://opensearch-project.github.io/helm-charts/index.yaml"
)

# The chart README documents its supported range, e.g.
#   "This helm-chart repository is tested with kubernetes version 1.19 and above"
_K8S_REQ_RE = re.compile(
    r"(?i)kubernetes\s+version\s+(1\.\d+)\s+and\s+above", re.MULTILINE
)
# Fallback for a stricter "Kubernetes 1.19+" style statement
_K8S_PLUS_RE = re.compile(r"(?i)kubernetes\s+v?(1\.\d+)\s*\+")


def parse_min_kubernetes(text: str) -> str:
    """Extract the minimum supported Kubernetes minor from the chart README.

    Raises ValueError when no documented requirement is present (fail closed).
    """
    m = _K8S_REQ_RE.search(text) or _K8S_PLUS_RE.search(text)
    if not m:
        raise ValueError("Kubernetes requirement not found in README")
    v = validate_semver(m.group(1))
    if not v:
        raise ValueError(f"Invalid Kubernetes version in README: {m.group(1)}")
    return f"{v.major}.{v.minor}"


def expand_minimum(floor: str, latest: str) -> list[str]:
    """Kubernetes minors tracked for a release, newest first.

    The documented requirement is a floor ("kubernetes version 1.19 and
    above"). The matrix tracks only the three newest stable minors, so the
    floor constrains a fixed-size window rather than expanding the list. A
    floor newer than the tracked latest stable release fails closed: no
    tracked Kubernetes version satisfies it.
    """
    floor_v = validate_semver(floor)
    latest_v = validate_semver(latest)
    if not floor_v or not latest_v:
        raise ValueError(f"Invalid version: floor={floor} latest={latest}")
    if floor_v > latest_v:
        raise ValueError(
            f"Minimum Kubernetes {floor} is newer than Plural's tracked "
            f"latest stable {latest}"
        )
    expanded = expand_kube_versions(floor, latest)
    # expand_kube_versions can overshoot by one minor when floor == latest.
    # Compare as version tuples: string compare breaks across digit
    # boundaries ("1.9" > "1.10" lexicographically).
    supported = [
        v for v in expanded
        if validate_semver(v) and validate_semver(v) <= latest_v
    ]
    return supported[-LATEST_KUBE_MINORS:][::-1]


def server_releases(index_doc: dict) -> list[tuple[str, str]]:
    """(server_version, tag) pairs for the OpenSearch server chart.

    Driven by the official Helm index (newest first), not by the chart's
    own tag names: the server chart's version number does not track the
    OpenSearch server version it packages (chart 2.38.0 ships server
    2.19.6), so rows are keyed by the server (app) version from the index.
    The chart version maps to its immutable release tag, whose README
    documents the Kubernetes floor shipped with that chart. Duplicate
    server versions (several chart releases can package the same server)
    keep the newest chart.
    """
    entries = (index_doc or {}).get("entries", {}).get(CHART_NAME, [])
    seen = set()
    result: list[tuple[str, str]] = []
    for entry in entries:
        chart_version = (entry.get("version") or "").lstrip("v")
        server_version = (entry.get("appVersion") or "").lstrip("v")
        if not chart_version or not server_version:
            continue
        if server_version in seen:
            continue
        seen.add(server_version)
        result.append((server_version, f"{CHART_NAME}-{chart_version}"))
        if len(result) >= MAX_RELEASES:
            break
    return result


def _ref_candidates(tag: str) -> list[str]:
    """Immutable refs whose README documents a chart release.

    Some chart releases only cut a pre-release tag (e.g. ``3.7.0-1``);
    the plain stable tag may never be created. The pre-release tag is
    still immutable, and its README is the documentation that shipped
    with that chart line.
    """
    return [tag, f"{tag}-1"]


def build_rows(
    releases: list[tuple[str, str]],
    latest_minor: str,
    docs_get: Callable[[str], Optional[bytes]],
) -> list[OrderedDict[str, object]]:
    """Compatibility rows from per-release README documentation.

    docs_get maps a release README URL to raw bytes (or None).
    """
    rows: list[OrderedDict[str, object]] = []
    for version, tag in releases:
        content = None
        for ref in _ref_candidates(tag):
            url = README_URL.format(
                owner=REPO_OWNER, name=REPO_NAME, commitish=ref
            )
            content = docs_get(url)
            if content:
                break
        if not content:
            print_warning(f"No README found for {version}")
            continue
        try:
            text = content.decode("utf-8", errors="strict")
        except UnicodeDecodeError:
            print_warning(f"Could not decode README for {version}")
            continue
        try:
            floor = parse_min_kubernetes(text)
        except ValueError as e:
            print_warning(f"{version}: {e}")
            continue
        try:
            kube = expand_minimum(floor, latest_minor)
        except ValueError as e:
            print_warning(f"{version}: {e}; skipped")
            continue
        rows.append(
            OrderedDict(
                [
                    ("version", version),
                    ("kube", kube),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )
    return rows


def scrape() -> None:
    latest = latest_kube_version()
    latest_minor = f"{latest.major}.{latest.minor}" if latest else None
    if not latest_minor:
        print_error("Could not determine the latest Kubernetes version")
        return

    try:
        index_doc = yaml.safe_load(fetch_page(HELM_INDEX_URL) or b"")
    except Exception as e:
        print_error(f"Failed to fetch the Helm index: {e}")
        return
    releases = server_releases(index_doc)
    if not releases:
        print_error(f"No {CHART_NAME} chart versions found in the Helm index")
        return

    rows = build_rows(releases, latest_minor, fetch_page)
    if not rows:
        print_error("No compatibility information found for OpenSearch")
        return

    output_path = f"../../static/compatibilities/{app_name}.yaml"
    update_compatibility_info(output_path, rows)

    compatibility_yaml = read_yaml(output_path)
    if compatibility_yaml and compatibility_yaml.get("helm_repository_url"):
        update_chart_versions(app_name, CHART_NAME)
