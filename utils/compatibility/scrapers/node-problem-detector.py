from __future__ import annotations

import re
from collections import OrderedDict

import yaml
from packaging.version import Version

from utils import (
    fetch_page,
    print_error,
    update_compatibility_info,
    validate_semver,
)


APP_NAME = "node-problem-detector"
RELEASES_URL = (
    "https://api.github.com/repos/kubernetes/node-problem-detector/releases"
)
HELM_INDEX_URL = (
    "https://raw.githubusercontent.com/deliveryhero/helm-charts/master/index.yaml"
)
IMAGE_REPOSITORY = (
    "registry.k8s.io/node-problem-detector/node-problem-detector"
)
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"

# NPD switched to v1.<kubernetes_minor>.<patch> starting with Kubernetes 1.34.
# Earlier v0.x releases used a different scheme and did not publish a precise
# Kubernetes compatibility range, so this scraper intentionally omits them.
VERSION_PATTERN = re.compile(r"^v1\.(\d+)\.(\d+)$")
MIN_ALIGNED_KUBE_MINOR = 34


def parse_release_tag(tag: str) -> tuple[str, str] | None:
    """Map a Kubernetes-aligned NPD release tag to app and Kubernetes versions."""
    match = VERSION_PATTERN.fullmatch(str(tag).strip())
    if not match:
        return None

    kube_minor = int(match.group(1))
    if kube_minor < MIN_ALIGNED_KUBE_MINOR:
        return None

    return f"1.{kube_minor}.{int(match.group(2))}", f"1.{kube_minor}"


def _release_pages():
    for page in range(1, 11):
        content = fetch_page(f"{RELEASES_URL}?per_page=100&page={page}")
        if not content:
            return
        try:
            releases = yaml.safe_load(content)
        except yaml.YAMLError as exc:
            print_error(f"Failed to parse Node Problem Detector releases: {exc}")
            return
        if not isinstance(releases, list):
            print_error("Node Problem Detector releases response was not a list.")
            return
        if not releases:
            return
        yield releases


def get_stable_release_tags() -> list[str]:
    tags = []
    for releases in _release_pages():
        for release in releases:
            if not isinstance(release, dict):
                continue
            if release.get("draft") or release.get("prerelease"):
                continue

            tag = str(release.get("tag_name", "")).strip()
            if parse_release_tag(tag):
                tags.append(tag)
    return tags


def _latest_chart_versions(entries) -> dict[str, str]:
    """Map exact NPD app versions to the newest matching Helm chart version."""
    latest: dict[str, str] = {}
    for chart in entries:
        if not isinstance(chart, dict):
            continue

        app_version = str(chart.get("appVersion", "")).strip().lstrip("v")
        chart_version = str(chart.get("version", "")).strip().lstrip("v")
        if not parse_release_tag(f"v{app_version}"):
            continue
        if not validate_semver(chart_version):
            continue

        current = latest.get(app_version)
        if not current or Version(chart_version) > Version(current):
            latest[app_version] = chart_version
    return latest


def get_chart_versions() -> dict[str, str]:
    content = fetch_page(HELM_INDEX_URL)
    if not content:
        return {}

    try:
        index = yaml.safe_load(content)
    except yaml.YAMLError as exc:
        print_error(f"Failed to parse Node Problem Detector Helm index: {exc}")
        return {}

    if not isinstance(index, dict):
        print_error("Node Problem Detector Helm index was not a mapping.")
        return {}

    entries = (index.get("entries") or {}).get(APP_NAME)
    if not isinstance(entries, list):
        print_error("No Node Problem Detector entries found in Helm index.")
        return {}

    return _latest_chart_versions(entries)


def build_rows(tags: list[str], chart_versions: dict[str, str]) -> list[OrderedDict]:
    rows: dict[str, OrderedDict] = {}

    for tag in tags:
        parsed = parse_release_tag(tag)
        if not parsed:
            continue
        app_version, kube_version = parsed

        row = OrderedDict(
            [
                ("version", app_version),
                ("kube", [kube_version]),
                ("requirements", []),
                ("incompatibilities", []),
            ]
        )
        chart_version = chart_versions.get(app_version)
        if chart_version:
            row["chart_version"] = chart_version
        row["images"] = [f"{IMAGE_REPOSITORY}:v{app_version}"]
        rows[app_version] = row

    return sorted(rows.values(), key=lambda row: Version(row["version"]), reverse=True)


def scrape():
    tags = get_stable_release_tags()
    if not tags:
        print_error("No Kubernetes-aligned Node Problem Detector releases found.")
        return

    rows = build_rows(tags, get_chart_versions())
    if not rows:
        print_error("No Node Problem Detector compatibility rows built.")
        return

    update_compatibility_info(TARGET_FILE, rows)
