from __future__ import annotations

import re
from collections import OrderedDict

import requests
from packaging.version import Version

from utils import (
    fetch_page,
    print_error,
    update_compatibility_info,
)


APP_NAME = "kubeedge"
README_URL = "https://raw.githubusercontent.com/kubeedge/kubeedge/master/README.md"
RELEASES_URL = "https://api.github.com/repos/kubeedge/kubeedge/releases"
REQUEST_TIMEOUT = 30
SUPPORTED_MARK = "✓"


def _decode(content):
    try:
        return content.decode("utf-8") if isinstance(content, bytes) else content
    except UnicodeDecodeError as exc:
        print_error(f"Failed to decode KubeEdge README: {exc}")
        return None


def _version(value):
    match = re.search(r"\d+\.\d+(?:\.\d+)?", value)
    return match.group(0) if match else None


def _minor(version):
    parts = version.split(".")
    if len(parts) < 2:
        return None
    return f"{parts[0]}.{parts[1]}"


def _table_lines(readme):
    lines = readme.splitlines()
    table = []
    found_heading = False

    for line in lines:
        stripped = line.strip()
        if stripped == "## Kubernetes compatibility":
            found_heading = True
            continue
        if not found_heading:
            continue

        if stripped.startswith("|"):
            table.append(stripped)
        elif table:
            break

    return table


def latest_stable_release_by_minor():
    latest = {}

    for page in range(1, 4):
        response = requests.get(
            RELEASES_URL,
            params={"page": page, "per_page": 100},
            timeout=REQUEST_TIMEOUT,
        )
        if response.status_code != 200:
            raise Exception(f"Failed to fetch KubeEdge releases: {response.status_code}")

        releases = response.json()
        if not releases:
            break

        for release in releases:
            if release.get("draft") or release.get("prerelease"):
                continue

            tag = release.get("tag_name", "").lstrip("v")
            if not re.match(r"^\d+\.\d+\.\d+$", tag):
                continue

            parsed = Version(tag)
            minor = f"{parsed.major}.{parsed.minor}"
            current = latest.get(minor)
            if current is None or parsed > Version(current):
                latest[minor] = tag

    return latest


def parse_matrix(readme, release_versions):
    table = _table_lines(readme)
    if len(table) < 3:
        return []

    headers = [cell.strip() for cell in table[0].strip("|").split("|")]
    kube_columns = [
        (index, version)
        for index, header in enumerate(headers)
        if index > 0 and (version := _version(header))
    ]
    rows = []

    for line in table[2:]:
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        if len(cells) < 2:
            continue

        kubeedge_minor = _version(cells[0])
        if not kubeedge_minor:
            continue

        release_version = release_versions.get(_minor(kubeedge_minor))
        if not release_version:
            continue

        supported_kube_versions = [
            kube_version
            for column, kube_version in kube_columns
            if column < len(cells) and cells[column] == SUPPORTED_MARK
        ]
        if not supported_kube_versions:
            continue

        rows.append(
            OrderedDict(
                [
                    ("version", release_version),
                    ("kube", supported_kube_versions),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )

    return rows


def scrape():
    content = fetch_page(README_URL)
    if not content:
        return

    readme = _decode(content)
    if not readme:
        return

    release_versions = latest_stable_release_by_minor()
    rows = parse_matrix(readme, release_versions)
    if not rows:
        print_error("No compatibility information found for KubeEdge")
        return

    update_compatibility_info(f"../../static/compatibilities/{APP_NAME}.yaml", rows)
