from __future__ import annotations

import re
from collections import OrderedDict
from typing import Callable, Optional

import requests

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

RELEASES_API_URL = "https://api.github.com/repos/{owner}/{name}/releases"
README_URL = (
    "https://raw.githubusercontent.com/{owner}/{name}/{commitish}/README.md"
)

# The chart README documents its supported range, e.g.
#   "This helm-chart repository is tested with kubernetes version 1.19 and above"
_K8S_REQ_RE = re.compile(
    r"(?i)kubernetes\s+version\s+(1\.\d+)\s+and\s+above", re.MULTILINE
)
# Fallback for a stricter "Kubernetes 1.19+" style statement
_K8S_PLUS_RE = re.compile(r"(?i)kubernetes\s+v?(1\.\d+)\s*\+")

# Only the OpenSearch server chart (never dashboards/data-prepper variants)
_TAG_RE = re.compile(r"^opensearch-(\d+\.\d+\.\d+)(?:-\d+)?$")


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
    supported = [v for v in expanded if v <= latest]
    return supported[-LATEST_KUBE_MINORS:][::-1]


def server_releases(release_data: list[dict]) -> list[tuple[str, str]]:
    """(app_version, commitish) pairs for the OpenSearch server chart.

    Newest first. Duplicate app versions (chart patch releases) keep only
    the newest entry.
    """
    seen = set()
    result: list[tuple[str, str]] = []
    for release in release_data:
        tag = release.get("tag_name") or ""
        m = _TAG_RE.match(tag)
        if not m:
            continue
        version = m.group(1)
        if version in seen:
            continue
        seen.add(version)
        commitish = release.get("target_commitish") or "main"
        result.append((version, commitish))
        if len(result) >= MAX_RELEASES:
            break
    return result


def build_rows(
    releases: list[tuple[str, str]],
    latest_minor: str,
    docs_get: Callable[[str], Optional[bytes]],
) -> list[OrderedDict[str, object]]:
    """Compatibility rows from per-release README documentation.

    docs_get maps a release README URL to raw bytes (or None).
    """
    rows: list[OrderedDict[str, object]] = []
    for version, commitish in releases:
        url = README_URL.format(
            owner=REPO_OWNER, name=REPO_NAME, commitish=commitish
        )
        content = docs_get(url)
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


def _fetch_releases() -> list[dict]:
    releases: list[dict] = []
    for page in range(1, 3):
        response = requests.get(
            RELEASES_API_URL.format(owner=REPO_OWNER, name=REPO_NAME),
            params={"page": page, "per_page": 100},
        )
        if response.status_code != 200:
            break
        releases.extend(response.json())
    return releases


def scrape() -> None:
    latest = latest_kube_version()
    latest_minor = f"{latest.major}.{latest.minor}" if latest else None
    if not latest_minor:
        print_error("Could not determine the latest Kubernetes version")
        return

    try:
        releases = server_releases(_fetch_releases())
    except Exception as e:
        print_error(f"Failed to fetch releases: {e}")
        return
    if not releases:
        print_error(f"No {CHART_NAME} chart releases found")
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
