from __future__ import annotations

import re
from collections import OrderedDict

import requests
from packaging.version import Version

from utils import (
    expand_kube_versions,
    get_chart_versions,
    print_error,
    update_compatibility_info,
)


APP_NAME = "scylladb-operator"
CHART_NAME = "scylla-operator"
HELM_REPO_URL = "https://scylla-operator-charts.storage.googleapis.com/stable"
RELEASES_URL = "https://api.github.com/repos/scylladb/scylla-operator/releases"
RELEASE_DOCS_URL = "https://operator.docs.scylladb.com/v{minor}/reference/releases.md"
REQUEST_TIMEOUT = 30


def _decode(content):
    try:
        return content.decode("utf-8") if isinstance(content, bytes) else content
    except UnicodeDecodeError as exc:
        print_error(f"Failed to decode ScyllaDB Operator releases page: {exc}")
        return None


def _stable_version(tag):
    version = str(tag).strip().lstrip("v")
    if not re.match(r"^\d+\.\d+\.\d+$", version):
        return None
    return version


def _minor(version):
    parsed = Version(version)
    return f"{parsed.major}.{parsed.minor}"


def latest_stable_release_by_minor():
    latest = {}

    for page in range(1, 4):
        response = requests.get(
            RELEASES_URL,
            params={"page": page, "per_page": 100},
            timeout=REQUEST_TIMEOUT,
        )
        if response.status_code != 200:
            raise Exception(f"Failed to fetch ScyllaDB Operator releases: {response.status_code}")

        releases = response.json()
        if not releases:
            break

        for release in releases:
            if release.get("draft") or release.get("prerelease"):
                continue

            version = _stable_version(release.get("tag_name", ""))
            if not version:
                continue

            minor = _minor(version)
            current = latest.get(minor)
            if current is None or Version(version) > Version(current):
                latest[minor] = version

    return latest


def _support_matrix_lines(markdown):
    lines = markdown.splitlines()
    table = []
    found_heading = False

    for line in lines:
        stripped = line.strip()
        if stripped == "## Support matrix":
            found_heading = True
            continue
        if not found_heading:
            continue

        if stripped.startswith("|"):
            table.append(stripped)
        elif table:
            break

    return table


def _strip_markup(text):
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("**", "")
    return text.strip()


def _parse_table_row(line):
    return [_strip_markup(cell) for cell in line.strip().strip("|").split("|")]


def _expand_version_range(value):
    versions = []

    for part in value.split(","):
        part = part.strip()
        range_match = re.fullmatch(r"(\d+\.\d+)\s*-\s*(\d+\.\d+)", part)
        if range_match:
            versions.extend(expand_kube_versions(range_match.group(1), range_match.group(2)))
            continue

        versions.extend(re.findall(r"\b\d+\.\d+\b", part))

    deduped = []
    for version in versions:
        if version not in deduped:
            deduped.append(version)
    return deduped


def parse_kubernetes_support(markdown):
    for line in _support_matrix_lines(markdown):
        cells = _parse_table_row(line)
        if len(cells) < 2:
            continue

        if cells[0].lower() == "kubernetes":
            return _expand_version_range(cells[1])

    return []


def _docs_for_minor(minor):
    response = requests.get(RELEASE_DOCS_URL.format(minor=minor), timeout=REQUEST_TIMEOUT)
    if response.status_code != 200:
        return None
    return _decode(response.content)


def build_rows(release_versions, chart_versions):
    rows = []

    for minor, version in sorted(
        release_versions.items(),
        key=lambda item: Version(item[1]),
        reverse=True,
    ):
        chart_version = chart_versions.get(version)
        if not chart_version:
            continue

        markdown = _docs_for_minor(minor)
        if not markdown:
            continue

        kube_versions = parse_kubernetes_support(markdown)
        if not kube_versions:
            print_error(f"No Kubernetes support range found for ScyllaDB Operator {minor}")
            continue

        rows.append(
            OrderedDict(
                [
                    ("version", version),
                    ("kube", kube_versions),
                    ("chart_version", chart_version),
                    ("images", [f"docker.io/scylladb/scylla-operator:{version}"]),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )

    return rows


def scrape():
    release_versions = latest_stable_release_by_minor()
    if not release_versions:
        print_error("No stable ScyllaDB Operator releases found")
        return

    chart_versions = get_chart_versions(APP_NAME, CHART_NAME)
    if not chart_versions:
        print_error("No ScyllaDB Operator chart versions found")
        return

    rows = build_rows(release_versions, chart_versions)
    if not rows:
        print_error("No ScyllaDB Operator compatibility rows generated")
        return

    update_compatibility_info(
        f"../../static/compatibilities/{APP_NAME}.yaml",
        rows,
    )
