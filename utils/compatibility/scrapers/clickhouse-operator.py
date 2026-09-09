from __future__ import annotations

import re
from collections import OrderedDict
from typing import Optional

from utils import (
    expand_kube_versions,
    fetch_page,
    get_github_releases,
    latest_kube_version,
    print_error,
    print_warning,
    read_yaml,
    update_chart_versions,
    update_compatibility_info,
    validate_semver,
)

app_name = "clickhouse-operator"

REPO_OWNER = "Altinity"
REPO_NAME = "clickhouse-operator"
CHART_NAME = "altinity-clickhouse-operator"
MAX_RELEASES = 20
# The compatibility matrix tracks the three newest Kubernetes minors per row.
LATEST_KUBE_MINORS = 3

# Strict form: a line that states only the requirement, e.g.
#   " * Kubernetes 1.25+"
#   "- Kubernetes 1.19 or later"
_STRICT_REQ_RE = re.compile(
    r"(?im)^\s*(?:\*|-)?\s*Kubernetes\s+v?(1\.\d+)\s*(?:\+|or\s+(?:later|above|newer))?\s*$"
)
# Loose fallback: any "Kubernetes 1.25+" mention
_LOOSE_REQ_RE = re.compile(r"(?i)kubernetes\s+v?(1\.\d+)\s*(?:\+|or\s+(?:later|above|newer))")


def _release_versions() -> list[str]:
    """Latest stable release versions, newest first (release-0.27.3 -> 0.27.3)."""
    try:
        tags = get_github_releases(REPO_OWNER, REPO_NAME)
    except Exception as e:
        print_error(f"Failed to fetch releases: {e}")
        return []
    seen = set()
    versions = []
    for tag in tags:
        m = re.fullmatch(r"release-v?(\d+\.\d+\.\d+)", tag)
        if not m or m.group(1) in seen:
            continue
        seen.add(m.group(1))
        versions.append(m.group(1))
    return versions[:MAX_RELEASES]


def _kube_floor(version: str) -> Optional[str]:
    """Read the minimum supported Kubernetes version from the release-tag README."""
    url = f"https://raw.githubusercontent.com/{REPO_OWNER}/{REPO_NAME}/release-{version}/README.md"
    content = fetch_page(url)
    if not content:
        print_warning(f"No README found for release-{version}")
        return None
    text = content.decode("utf-8", errors="ignore")
    m = _STRICT_REQ_RE.search(text) or _LOOSE_REQ_RE.search(text)
    if not m:
        print_warning(f"No Kubernetes requirement found in release-{version} README")
        return None
    v = validate_semver(m.group(1))
    return f"{v.major}.{v.minor}" if v else None


def _kube_list(floor: str, latest_minor: str) -> list[str]:
    """Newest supported Kubernetes minors for a release, descending.

    The documented requirement is a floor ("Kubernetes 1.25+"); the matrix
    tracks only the three newest stable minors, so intersect the expanded
    range with that window. Entries newer than the latest stable release are
    dropped (expand_kube_versions can overshoot when start == end).
    """
    expanded = expand_kube_versions(floor, latest_minor)
    supported = [v for v in expanded if v <= latest_minor]
    return supported[-LATEST_KUBE_MINORS:][::-1]


def scrape() -> None:
    latest = latest_kube_version()
    latest_minor = f"{latest.major}.{latest.minor}" if latest else None
    if not latest_minor:
        print_error("Could not determine the latest Kubernetes version")
        return

    rows: list[OrderedDict[str, object]] = []
    for version in _release_versions():
        floor = _kube_floor(version)
        if not floor:
            continue
        floor_v = validate_semver(floor)
        latest_v = validate_semver(latest_minor)
        if floor_v and latest_v and floor_v > latest_v:
            floor = latest_minor
        rows.append(
            OrderedDict(
                [
                    ("version", version),
                    ("kube", _kube_list(floor, latest_minor)),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )

    if not rows:
        print_error("No compatibility information found for ClickHouse Operator")
        return

    output_path = f"../../static/compatibilities/{app_name}.yaml"
    update_compatibility_info(output_path, rows)

    compatibility_yaml = read_yaml(output_path)
    if compatibility_yaml and compatibility_yaml.get("helm_repository_url"):
        update_chart_versions(app_name, CHART_NAME)
