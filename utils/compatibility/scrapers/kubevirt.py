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

app_name = "kubevirt"
matrix_url = "https://raw.githubusercontent.com/kubevirt/sig-release/main/releases/k8s-support-matrix.md"
REQUEST_TIMEOUT = 30


def decode_markdown(content: bytes) -> str | None:
    try:
        return content.decode("utf-8")
    except UnicodeDecodeError as exc:
        print_error(f"Failed to decode KubeVirt support matrix: {exc}")
        return None


def normalize_cell(value: str) -> str:
    cleaned = re.sub(r"<[^>]+>", "", value).strip()
    version_match = re.search(r"\d+\.\d+", cleaned)
    return version_match.group(0) if version_match else cleaned


def latest_stable_release_by_minor() -> dict[str, str]:
    latest: dict[str, str] = {}
    releases: list[str] = []

    for page in range(1, 4):
        response = requests.get(
            "https://api.github.com/repos/kubevirt/kubevirt/releases",
            params={"page": page, "per_page": 100},
            timeout=REQUEST_TIMEOUT,
        )
        if response.status_code != 200:
            raise Exception(f"Failed to fetch KubeVirt releases: {response.status_code}")

        page_releases = response.json()
        if not page_releases:
            break
        releases.extend(release["tag_name"] for release in page_releases)

    for release in releases:
        version = release.lstrip("v")
        if not re.match(r"^\d+\.\d+\.\d+$", version):
            continue

        parsed = Version(version)
        minor_key = f"{parsed.major}.{parsed.minor}"
        current = latest.get(minor_key)
        if current is None or parsed > Version(current):
            latest[minor_key] = version

    return latest


def extract_support_matrix_table(markdown: str) -> list[str]:
    lines = markdown.splitlines()
    table_lines: list[str] = []
    found_heading = False

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("# KubeVirt to Kubernetes version support matrix"):
            found_heading = True
            continue
        if not found_heading:
            continue

        if stripped.startswith("|"):
            table_lines.append(stripped)
        elif table_lines:
            break

    return table_lines


def parse_matrix(markdown: str, release_versions: dict[str, str]) -> list[OrderedDict[str, object]]:
    table_lines = extract_support_matrix_table(markdown)
    if len(table_lines) < 3:
        return []

    headers = [normalize_cell(cell) for cell in table_lines[0].strip("|").split("|")]
    kube_versions = headers[1:]
    versions: list[OrderedDict[str, object]] = []

    for line in table_lines[2:]:
        cells = [normalize_cell(cell) for cell in line.strip("|").split("|")]
        if len(cells) < 2:
            continue

        minor_version = cells[0]
        release_version = release_versions.get(minor_version)
        if not release_version:
            continue

        supported_kube_versions = [
            kube_version
            for kube_version, value in zip(kube_versions, cells[1:])
            if value == "\u2713"
        ]
        if not supported_kube_versions:
            continue

        versions.append(
            OrderedDict(
                [
                    ("version", release_version),
                    ("kube", supported_kube_versions),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )

    return versions


def scrape() -> None:
    content = fetch_page(matrix_url)
    if not content:
        return

    markdown = decode_markdown(content)
    if not markdown:
        return

    release_versions = latest_stable_release_by_minor()
    versions = parse_matrix(markdown, release_versions)
    if not versions:
        print_error("No compatibility information found for KubeVirt")
        return

    update_compatibility_info(f"../../static/compatibilities/{app_name}.yaml", versions)
