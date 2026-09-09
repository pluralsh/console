from __future__ import annotations

import re
from collections import OrderedDict
from typing import Callable, Optional

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

GIT_REPO_URL = "https://github.com/Altinity/clickhouse-operator"
README_URL = "https://raw.githubusercontent.com/Altinity/clickhouse-operator/release-{version}/README.md"

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


def parse_min_kubernetes(text: str) -> str:
    """Extract the minimum supported Kubernetes minor from a release README.

    Raises ValueError when no documented requirement is present (fail closed).
    """
    m = _STRICT_REQ_RE.search(text) or _LOOSE_REQ_RE.search(text)
    if not m:
        raise ValueError("Kubernetes requirement not found in README")
    v = validate_semver(m.group(1))
    if not v:
        raise ValueError(f"Invalid Kubernetes version in README: {m.group(1)}")
    return f"{v.major}.{v.minor}"


def expand_minimum(floor: str, latest: str) -> list[str]:
    """Kubernetes minors tracked for a release, newest first.

    The documented requirement is a floor ("Kubernetes 1.25+"). The matrix
    tracks only the three newest stable minors, so the floor constrains a
    fixed-size window rather than expanding the list. A floor newer than the
    tracked latest stable release fails closed: no tracked Kubernetes version
    satisfies it.
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


def build_rows(
    release_versions: list[str],
    latest_minor: str,
    docs_get: Callable[[str], Optional[bytes]],
) -> list[OrderedDict[str, object]]:
    """Compatibility rows from per-release README documentation.

    docs_get maps a release-tag README URL to raw bytes (or None).
    """
    rows: list[OrderedDict[str, object]] = []
    for version in release_versions:
        url = README_URL.format(version=version)
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


def scrape() -> None:
    latest = latest_kube_version()
    latest_minor = f"{latest.major}.{latest.minor}" if latest else None
    if not latest_minor:
        print_error("Could not determine the latest Kubernetes version")
        return

    rows = build_rows(_release_versions(), latest_minor, fetch_page)
    if not rows:
        print_error("No compatibility information found for ClickHouse Operator")
        return

    output_path = f"../../static/compatibilities/{app_name}.yaml"
    update_compatibility_info(output_path, rows)

    compatibility_yaml = read_yaml(output_path)
    if compatibility_yaml and compatibility_yaml.get("helm_repository_url"):
        update_chart_versions(app_name, CHART_NAME)
