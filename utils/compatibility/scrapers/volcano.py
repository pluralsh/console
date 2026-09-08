from __future__ import annotations

import re
from collections import OrderedDict

from semantic_version import Version
from utils import (
    fetch_page,
    get_chart_versions,
    print_error,
    update_chart_versions,
    update_compatibility_info,
    validate_semver,
)

app_name = "volcano"
compatibility_url = (
    "https://raw.githubusercontent.com/volcano-sh/volcano/master/README.md"
)


def split_table_row(line: str) -> list[str]:
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def latest_app_versions_by_minor(
    chart_versions: dict[str, str],
) -> dict[tuple[int, int], str]:
    latest: dict[tuple[int, int], tuple[Version, str]] = {}

    for app_version in chart_versions:
        version = validate_semver(app_version)
        if not version:
            continue

        key = (version.major, version.minor)
        current = latest.get(key)
        if not current or version > current[0]:
            latest[key] = (version, str(version))

    return {key: version for key, (_, version) in latest.items()}


def extract_table_data(
    markdown: str, chart_versions: dict[str, str]
) -> list[OrderedDict[str, object]]:
    lines = markdown.splitlines()
    header_index = next(
        (
            index
            for index, line in enumerate(lines)
            if line.startswith("|") and "Kubernetes 1." in line
        ),
        None,
    )
    if header_index is None:
        return []

    kube_versions = []
    for cell in split_table_row(lines[header_index])[1:]:
        match = re.search(r"Kubernetes\s+v?(\d+\.\d+)", cell)
        kube_versions.append(match.group(1) if match else None)

    latest_versions = latest_app_versions_by_minor(chart_versions)
    rows = []
    for line in lines[header_index + 2 :]:
        if not line.startswith("|"):
            break

        cells = split_table_row(line)
        version_match = re.fullmatch(
            r"Volcano\s+v?(\d+)\.(\d+)", cells[0], re.IGNORECASE
        )
        if not version_match:
            continue

        major, minor = (int(value) for value in version_match.groups())
        app_version = latest_versions.get((major, minor))
        if not app_version:
            continue

        compatible_kube_versions = [
            kube_version
            for kube_version, marker in zip(kube_versions, cells[1:])
            if kube_version and marker == "✓"
        ]
        if not compatible_kube_versions:
            continue

        rows.append(
            OrderedDict(
                [
                    ("version", app_version),
                    ("kube", compatible_kube_versions),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )

    return rows


def scrape() -> None:
    page_content = fetch_page(compatibility_url)
    if not page_content:
        return

    try:
        markdown = page_content.decode("utf-8")
    except UnicodeDecodeError as exc:
        print_error(f"Failed to decode the Volcano compatibility table: {exc}")
        return

    chart_versions = get_chart_versions(app_name)
    if not chart_versions:
        return

    rows = extract_table_data(markdown, chart_versions)
    if not rows:
        print_error("No compatibility information found for Volcano.")
        return

    update_compatibility_info(
        f"../../static/compatibilities/{app_name}.yaml", rows
    )
    update_chart_versions(app_name)
